import { DeployedObject, IShell, Logger, SERVICE_STATUS, DeployedWorkload, DeployedWorkloadInstance, DeployedIngress, DeployedDomain, DeploymentStat, MetricItem, MetricData, MetricFilter } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex } from 'stream';
import { MemoryDB } from './MemoryDB';
import { AwsMemroyDBApi } from './AwsMemroyDBApi';
import { Cluster, Node } from '@aws-sdk/client-memorydb';
import { Statistic } from '@aws-sdk/client-cloudwatch';


const logger = Logger.getLogger('app:AwsMemoryDBApp');


export default class AwsMemoryDBApp extends AwsAppController<MemoryDB> {

  private readonly memroyDBApi: AwsMemroyDBApi = new AwsMemroyDBApi();

  /**
   * AwsAppController.getDirname
   * @returns 
   */
  public getDirname(): string {
    return __dirname;
  }

  /**
   * AwsAppController.readOptions
   * @returns 
   */
  public async readOptions(): Promise<MemoryDB> {

    // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
    let region = this.request.options.region || this.plugin?.options?.REGION;
    // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.    
    let vpcId = this.request.options.vpcId || this.plugin?.options?.VPC_ID;

    // Underscores ('_') are not allowed in Terraform
    let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
    const array = this.request.options.engine.split(' ', 2);
    let engine = array[0];
    let engineVersion = array[1];
    let instanceClass = this.request.options.instanceClass;
    const env = this.resolveEnv(this.request.options?.env);

    const prevOptions = await this.store.loadObject('option');
    // This setting is fixed and cannot be updated.
    if (prevOptions) {
      region = prevOptions?.region;
      vpcId = prevOptions?.vpcId;
      identifier = prevOptions?.identifier;
      engine = prevOptions?.engine;
      engineVersion = prevOptions?.engineVersion;
      instanceClass = prevOptions?.instanceClass;
    }

    if (!region) throw new Error(`options 'Region' is required`);
    if (!vpcId) throw new Error(`options 'VPC ID' is required`);
    if (!engine) throw new Error(`options 'Engine(Database)' is required`);
    if (!instanceClass) throw new Error(`options 'Instance Class' is required`);

    const options = {
      region,
      vpcId,
      identifier,
      engine,
      engineVersion,
      instanceClass,
      env
    } as MemoryDB

    await this.store.save('option', options);

    return options;

  }

  /**
   * AwsAppController.saveOutput
   * Called by AwsAppController.runApply
   * @param stream 
   * @param shell 
   * @param options 
   */
  public async saveOutput(stream: Duplex, shell: IShell, options?: MemoryDB): Promise<void> {
    return;
  }

  /**
   * AwsAppController.saveDescribe
   * Called by AwsAppController.start
   * Describe instances via the AwsMemroyDBApi(aws sdk)
   * @param options 
   */
  public async saveDescribe(options: MemoryDB): Promise<void> {

    const cluster: Cluster = await this.memroyDBApi.describe(options.region, options.identifier);

    await this.store.save('info',
      {
        cluster,
        deployed: (cluster?.Status === 'available') ? true : false,
      }
    );
  }

  /**
   * AppController.list 
   * @param kind 
   * @returns 
   */
  public async list(kind?: string): Promise<DeployedObject[]> {

    const deployedObjects: DeployedObject[] = []
    const info = await this.store.loadObject('info');
    if (!info) return deployedObjects;
    const options = await this.store.loadObject('option');

    logger.info(`[LIST]`, this.request);
    logger.info(`[LIST][info]`, info);

    const cluster: Cluster = info?.cluster;

    // workload.instances
    const instances: DeployedWorkloadInstance[] = [];
    for (const node of cluster?.Shards[0].Nodes) {
      const instance = {
        // kind: "workloadInstance",
        name: node.Name,
        id: node.Name,
        status: (node.Status === 'available') ? 'running' : node.Status,
        started: node.CreateTime,
        ip: node.Endpoint.Address,
        expose: [node.Endpoint.Port]
      } as DeployedWorkloadInstance;

      instances.push(instance);
    }

    // workload
    const workload = {
      kind: 'workload',
      name: options.identifier,
      displayName: options.identifier,
      replicas: cluster?.NumberOfShards,
      ready: cluster?.NumberOfShards,
      instances
    } as DeployedWorkload;
    deployedObjects.push(workload);


    const domain = {
      kind: 'domain',
      name: options.identifier,
      entrypoints: [cluster?.ClusterEndpoint?.Address],
      // service: db_instance.DbInstancePort,
      servicePort: cluster?.ClusterEndpoint?.Port,
      status: 'bound',
      description: cluster?.ClusterEndpoint
    } as DeployedDomain;
    deployedObjects.push(domain);

    return deployedObjects;
  }

  /**
   * AppController.getStat
   * @returns 
   */
  public async getStat(): Promise<DeploymentStat> {

    const option = (await this.store.loadObject('option')) as MemoryDB;
    const info = await this.store.loadObject('info');

    const statObject = {
      region: option?.region,
      metric: 'cloudwatch',
      namespace: 'AWS/MemoryDB',
      dimensionName: 'ClusterName',
      dimensionValue: info?.cluster?.Name,
      identifier: option.identifier
    }

    return {
      status: info?.deployed ? SERVICE_STATUS.running : SERVICE_STATUS.stopped,
      cpu: +info?.cpu || 0,
      memory: +info?.cpu || 0,
      disk: +info?.cpu || 0,
      replicas: info?.deployed ? 1 : 0,
      ready: info?.deployed ? 1 : 0,
      available: info?.deployed ? 1 : 0,
      unavailable: 0,
      entrypoints: info?.endpoint
        ?
        [
          {
            link: info.endpoint,
            type: 'tcp'
          }
        ]
        : null,
      exposes: [],
      objects: [statObject],
      since: new Date(info?.launch_time)
    };
  }

  /**
   * AppController.getMetricItems
   * https://docs.aws.amazon.com/ko_kr/memorydb/latest/devguide/metrics.memorydb.html
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
        name: 'FreeableMemory',
        title: 'FreeableMemory',
        unit: 'Byte'
      },
      {
        name: 'NetworkBytesIn',
        title: 'NetworkBytesIn',
        unit: 'Byte',
        // options: {
        //   mode: 'sum'
        // }
      },
      {
        name: 'NetworkBytesOut',
        title: 'NetworkBytesOut',
        unit: 'Byte',
        // options: {
        //   mode: 'sum'
        // }
      },
      {
        name: 'CurrConnections',
        title: 'CurrConnections',
        unit: '',
      },
      {
        name: 'CurrItems',
        title: 'CurrItems',
        unit: '',
      },
      {
        name: 'DatabaseMemoryUsagePercentage',
        title: 'DatabaseMemoryUsagePercentage',
        unit: '%',
      },
      {
        name: 'DatabaseCapacityUsagePercentage',
        title: 'DatabaseCapacityUsagePercentage',
        unit: '%',
      }
    ]
  }


  /**
   * AppController.getMetric
   * @param name 
   * @param options 
   * @returns 
   */
  public async getMetric(name: string, options: MetricFilter): Promise<MetricData> {

    const metricObject = await this.getStatObject();
    if (metricObject === undefined) return;

    let metricData = null;

    switch (name) {
      case 'CPUUtilization':
      case 'FreeableMemory':
      case 'DatabaseMemoryUsagePercentage':
      case 'DatabaseCapacityUsagePercentage':
        metricData = await this.cloudwatchApi.getMetricData(name, Statistic.Average, metricObject, options);
        break;
      case 'NetworkBytesIn': // memoryDB
      case 'NetworkBytesOut': // memoryDB
        metricData = await this.cloudwatchApi.getMetricData(name, Statistic.Sum, metricObject, options);
        break;
      case 'CurrConnections': // memoryDB
      case 'CurrItems': // memoryDB
        metricData = await this.cloudwatchApi.getMetricData(name, Statistic.Maximum, metricObject, options);
        break;
      default:
        logger.warn(`[METRIC][${this.deployment.name}] undefined metric item '${name}'`);
        return;
    }

    logger.info(`[METRIC]`, metricData);
    return metricData;
  }


}
