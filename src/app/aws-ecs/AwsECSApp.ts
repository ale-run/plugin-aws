import { DeployedObject, IShell, Logger, SERVICE_STATUS, DeployedWorkload, DeployedWorkloadInstance, DeployedIngress, DeployedDomain, DeploymentStat, MetricItem, MetricData, MetricFilter, DeployedExpose, DeployedVolume } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex } from 'stream';
import { ECS } from './ECS';
import { Volume } from './Volume';
import { AwsECSApi } from './AwsECSApi';
import { Task, TaskDefinition } from '@aws-sdk/client-ecs';
import { AwsELBApi } from '../AwsELBApi';
import { LoadBalancer, LoadBalancerStateEnum } from '@aws-sdk/client-elastic-load-balancing-v2';
import { ECSInfo } from './ECSInfo';
import { Statistic } from '@aws-sdk/client-cloudwatch';


const logger = Logger.getLogger('app:AwsECSApp');

/**
 * Requires a pre-existing ECS cluster (sg : All TCP & VPC CIDR )
 * Requires a pre-existing EFS to use the volume (sg : NFS 2049 & VPC CIDR)
 */
export default class AwsECSApp extends AwsAppController<ECS> {

  private readonly ecsApi: AwsECSApi = new AwsECSApi();
  private readonly elbApi: AwsELBApi = new AwsELBApi();

  // Requires ECS cluster name
  private readonly CLUSTER_NAME = 'ecs-cluster-ec2';
  // Requires EFS name
  private readonly EFS_NAME = 'ecs-efs-volume';
  private readonly TASK_ROLE_NAME = 'ecsTaskExecutionRole'

  /**
   * AwsAppController.getDirname
   * @returns 
   */
  public getDirname(): string {
    return __dirname;
  }

  /**
   * AwsAppController.readOptions
   * @returns ECS
   */
  public async readOptions(): Promise<ECS> {

    // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.    
    let region = this.request.options.region || this.plugin?.options?.REGION;
    // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.
    let vpcId = this.request.options.vpcId || this.plugin?.options?.VPC_ID;
    const subnets = this.request.options.subnetIds;
    let subnetIds: string[] = subnets ? subnets.trim().split(',') : this.plugin?.options?.SUBNET_IDS;

    const publicSubnets = this.request.options.publicSubnetIds;
    let publicSubnetIds: string[] = publicSubnets ? publicSubnets.trim().split(',') : this.plugin?.options?.PUBLIC_SUBNET_IDS;

    // Underscores ('_') are not allowed in Terraform
    let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;

    let clusterName = this.request.options.clusterName;
    let taskRoleName = this.TASK_ROLE_NAME;

    const containerName = this.request.options.containerName;
    const containerImage = this.request.options.containerImage;
    const containerPort = this.request.options.containerPort;

    // service & lb name (32 character) 
    const serviceName = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.deploymentname

    const efsName = this.request.options.efsName || '';
    const volumes = this.request.options.volumes;
    const containerVolumes: Volume[] = [];
    if (volumes) {
      for (const v of volumes) {
        const containerVolume: Volume = {
          name: v.name,
          path: v.value,
          efs_path: '/' + serviceName + '/' + v.name,
          gid: 0,
          uid: 0
        }
        containerVolumes.push(containerVolume);
      }
    }

    const launchType = this.request.options.launchType;

    const desiredCount = this.request.options.desiredCount;
    let env = this.request.options?.env;


    let environments = [];
    if (env) {
      environments = env;
    }

    env = await this.resolveEnv(env);

    const prevOptions = await this.store.loadObject('option');
    // This setting is fixed and cannot be updated.
    if (prevOptions) {
      region = prevOptions?.region;
      vpcId = prevOptions?.vpcId;
      subnetIds = prevOptions?.subnetIds;
      publicSubnetIds = prevOptions?.publicSubnetIds;
      identifier = prevOptions?.identifier;
      clusterName = prevOptions?.clusterName;
      taskRoleName = prevOptions?.taskRoleName;
    }

    // logger.debug('containerVolumes=', JSON.stringify(containerVolumes));
    // logger.debug('environments=', JSON.stringify(environments));
    // logger.debug('env=', JSON.stringify(env));

    if (!region) throw new Error(`options 'Region' is required`);
    if (!vpcId) throw new Error(`options 'VPC ID' is required`);
    if (!subnetIds) throw new Error(`options 'Subnet IDs' is required`);
    if (!publicSubnetIds) throw new Error(`options 'Public Subnet IDs' is required`);
    if (!clusterName) throw new Error(`options 'Cluster Name' is required`);
    if (!containerName) throw new Error(`options 'Container Name' is required`);
    if (!containerImage) throw new Error(`options 'Container Image' is required`);
    if (!containerPort) throw new Error(`options 'Container Port' is required`);
    if (volumes && volumes.length > 0 && !efsName) throw new Error(`options 'EFS Name' is required when using volumes`);


    const options: ECS = {
      region,
      vpcId,
      subnetIds,
      publicSubnetIds,
      identifier,

      clusterName,
      taskRoleName,

      containerName,
      containerImage,
      containerPort,
      containerVolumes,
      efsName,

      serviceName,
      launchType,

      desiredCount,
      environments,
      env
    } as ECS;

    await this.store.save('option', options);

    return options;

  }

  /**
   * AwsAppController.saveOutput
   * @param stream 
   * @param shell 
   * @param options 
   */
  public async saveOutput(stream: Duplex, shell: IShell, options?: ECS): Promise<void> {
    return;
  }

  /**
   * AwsAppController.saveDescribe
   * Called by AwsAppController.start
   * Describe instances via the AwsECSApi & AwsELBApi(aws sdk)
   * @param region 
   * @param identifier 
   */
  public async saveDescribe(options: ECS) {
    // service
    const service = await this.ecsApi.describeService(options.region, options.clusterName, options.serviceName);
    // taskDefinition
    const taskDefinition = await this.ecsApi.describeTaskDefinition(options.region, service?.taskDefinition);
    // loadBalancer
    let loadBalancer: LoadBalancer;
    if (service?.loadBalancers) {
      const targetGroup = await this.elbApi.describeTargetGroup(options.region, service?.loadBalancers[0].targetGroupArn);
      loadBalancer = await this.elbApi.describeLoadBalancer(options.region, targetGroup?.LoadBalancerArns[0]);
    }
    // task
    let task: Task;
    if (options.desiredCount > 0) {
      task = await this.ecsApi.describeTaskNWaiting(options.region, options.clusterName, options.serviceName);
    }

    const ecsInfo: ECSInfo =
    {
      desiredCount: service?.desiredCount,
      runningCount: service?.runningCount,
      taskDefinition,
      loadBalancer,
      task,
    }

    await this.store.save('info', ecsInfo);
  }


  /**
   * AppController.stop
   * terraform apply 
   */
  public async stop(): Promise<void> {

    logger.info(`[STOP]`, this.request.name);
    await this.store.save('status', SERVICE_STATUS.stopping);

    const options = await this.store.loadObject('option') as ECS;

    options.desiredCount = 0;
    await this.runApply(options)

    logger.info(`[STOP]Done`, this.request.name);
    await this.store.save('status', SERVICE_STATUS.stopped);
    await this.saveDescribe(options);
  }

  /**
   * AppController.list 
   * @param type 
   * @returns 
   */
  public async list(kind?: string): Promise<DeployedObject[]> {

    const deployedObjects: DeployedObject[] = []

    const info = await this.store.loadObject('info');
    if (!info) return deployedObjects;
    const options = await this.store.loadObject('option');

    const taskDefinition: TaskDefinition = info.taskDefinition;
    const loadBalancer: LoadBalancer = info.loadBalancer;

    let task: Task;
    if (info.desiredCount > 0) {
      task = await this.ecsApi.describeTask(options.region, options.clusterName, options.serviceName);
      info.task = task;
    }

    // workload
    const workload = {
      kind: 'workload',
      name: options.serviceName,
      displayName: options.serviceName,
      replicas: info?.desiredCount,
      ready: info?.runningCount,
      instances: [
        {
          kind: 'task',
          name: task?.taskArn.split('/').reverse()[0],
          id: task?.taskArn,
          status: task?.lastStatus,
          // restarts: 0,
          started: new Date(task?.startedAt),
          ip: task?.attachments[0]?.details?.find(({ name }) => name === 'privateIPv4Address')?.value,
          limits: {
            cpu: task?.cpu,
            memory: task?.memory
          },
          // usage: {
          //   cpu: 0.3,
          //   memory: 256 * 1024 * 1024
          // },
          expose: [options.containerPort],
          description: task
        } as DeployedWorkloadInstance,
      ]
    } as DeployedWorkload;
    deployedObjects.push(workload);


    // ingress
    const ingress = {
      kind: 'ingress',
      name: loadBalancer?.LoadBalancerName,
      type: 'lb',
      entrypoints: [loadBalancer?.DNSName],
      // status?: "bound" | "unbound",
      status: (loadBalancer?.State?.Code === LoadBalancerStateEnum.ACTIVE) ? 'bound' : 'unbound',
      // service?: string;
      // servicePort?: number;
      description: loadBalancer
    } as DeployedIngress;
    deployedObjects.push(ingress);

    // volume
    const mountPoints = taskDefinition?.containerDefinitions?.[0].mountPoints;
    if (mountPoints && mountPoints.length > 0) {
      mountPoints.forEach((mountPoint, idx) => {
        
        const volume = taskDefinition?.volumes[idx];

        const v: DeployedVolume = {
          kind: 'volume',
          name: mountPoint?.sourceVolume,
          // name: `${mountPoint?.sourceVolume} (${mountPoint?.containerPath})`, 
          size: 0, // 용량, GiB 단위
          mode: (mountPoint?.readOnly) ? 'ro' : 'rwx', // 모드, rwo, rwx, ro
          status: 'bound',
          // fileSystemId: volume?.efsVolumeConfiguration.fileSystemId,
          // accessPointId: volume?.efsVolumeConfiguration.authorizationConfig.accessPointId,
          description: volume
        } as DeployedVolume
        deployedObjects.push(v);

      });
    }

    return deployedObjects;

  }

  /**
   * AppController.getStat
   * @returns 
   */
  public async getStat(): Promise<DeploymentStat> {

    const info = await this.store.loadObject('info') as ECSInfo;
    const option = await this.store.loadObject('option') as ECS;
    const status = await this.store.load('status');

    const regex = new RegExp('loadbalancer/(app/.*)');
    const match = regex.exec(info?.loadBalancer?.LoadBalancerArn);
    const loadBalancer = match?.[1];

    const statObject = {
      region: option?.region,
      metric: 'cloudwatch',
      namespace: 'AWS/ECS',
      dimensionName: 'ServiceName',
      dimensionValue: option?.serviceName,
      clusterName: option?.clusterName,
      loadBalancer,
      identifier: option?.identifier
    }

    const elbObject = {
      region: option?.region,
      metric: 'cloudwatch/ELB',
      namespace: 'AWS/ApplicationELB',
      dimensionName: 'LoadBalancer',
      dimensionValue: loadBalancer,
      identifier: option?.identifier
    }


    return {
      status: SERVICE_STATUS[status],
      objects: [statObject, elbObject],
      // cpu: +info?.cpu || 0,
      // memory: +info?.memory || 0,
      // disk: +info?.disk || 0,
      // replicas: status === 'running' ? 1 : 0,
      // ready: status === 'running' ? 1 : 0,
      // available: status === 'running' ? 1 : 0,
      // unavailable: status === 'running' ? 0 : 1,
      // entrypoints: info?.endpoint
      //   ?
      //   [
      //     {
      //       link: info.endpoint,
      //       type: 'tcp'
      //     }
      //   ]
      //   : null,
      // exposes: [],
      // since: new Date(info?.launch_time)
    };
  }

  // Metric
  // https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/developerguide/available-metrics.html
  /**
   * AppController.getMetricItems
   * @returns 
   */
  public async getMetricItems(): Promise<MetricItem[]> {

    return [
      {
        name: 'CPUUtilization',
        title: 'CPUUtilization',
        unit: '%'
      },
      {
        name: 'MemoryUtilization',
        title: 'MemoryUtilization',
        unit: '%',
      },
      {
        name: 'RequestCount',
        title: 'RequestCount',
        unit: 'Count',
      },
      {
        name: 'ProcessedBytes',
        title: 'ProcessedBytes',
        unit: 'Byte',
      },
      {
        name: 'HTTPCode_Target_2XX_Count',
        title: 'HTTPCode_Target_2XX_Count',
        unit: 'Count',
      },
      {
        name: 'HTTPCode_Target_3XX_Count',
        title: 'HTTPCode_Target_3XX_Count',
        unit: 'Count',
      },
      {
        name: 'HTTPCode_Target_4XX_Count',
        title: 'HTTPCode_Target_4XX_Count',
        unit: 'Count',
      },
      {
        name: 'HTTPCode_ELB_4XX_Count',
        title: 'HTTPCode_ELB_4XX_Count',
        unit: 'Count',
      },

    ]
  }
  

  public async getMetric(name: string, options: MetricFilter): Promise<MetricData> {

    let metricData = null;

    switch (name) {
      case 'CPUUtilization':
      case 'MemoryUtilization':
        const metricObject = await this.getStatObject();
        if (metricObject === undefined) return;
        metricData = await this.cloudwatchApi.getECSMetricData(name, Statistic.Average, metricObject, options);
        break;
      case 'RequestCount':        
      case 'ProcessedBytes':
      case 'HTTPCode_Target_2XX_Count':
      case 'HTTPCode_Target_3XX_Count':
      case 'HTTPCode_Target_4XX_Count':
      case 'HTTPCode_ELB_4XX_Count':
    
        const elbObject = await this.getStatObject('cloudwatch/ELB');
        if (elbObject === undefined) return;
        metricData = await this.cloudwatchApi.getMetricData(name, Statistic.Sum, elbObject, options);
        break;
      default:
        logger.warn(`[METRIC][${this.deployment.name}] undefined metric item '${name}'`);
        return;
    }

    logger.info(`[METRIC]`, metricData);
    return metricData;
  }


}
