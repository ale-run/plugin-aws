import { DeployedObject, IShell, Logger, SERVICE_STATUS, DeployedWorkload, DeployedWorkloadInstance, DeployedIngress, DeployedDomain, DeploymentStat, MetricItem, MetricData, MetricFilter } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex } from 'stream';
import { RDS } from './RDS';
import { AwsRDSApi } from './AwsRDSApi';
import { DBInstance } from '@aws-sdk/client-rds';
import { Statistic } from '@aws-sdk/client-cloudwatch';


const logger = Logger.getLogger('app:AwsRDSApp');


export default class AwsRDSApp extends AwsAppController<RDS> {

  private readonly rdsApi: AwsRDSApi = new AwsRDSApi();

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
  public async readOptions(): Promise<RDS> {

    // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
    let region = this.request.options.region || this.plugin?.options?.REGION;
    // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.    
    let vpcId = this.request.options.vpcId || this.plugin?.options?.VPC_ID;

    // Underscores ('_') are not allowed in Terraform
    let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
    let engine = this.request.options.engine;
    let engineVersion = engine === 'mysql' ? this.request.options.mysqlVersion : this.request.options.mariadbVersion;
    let dbSubnetGroupName = this.request.options.dbSubnetGroupName;
    let instanceClass = this.request.options.instanceClass;
    let username = this.request.options.username;
    let password = this.request.options.password;

    // if (password == undefined || password == null) {
    //   password = uniqid();
    // }

    const env = this.resolveEnv(this.request.options?.env);

    const prevOptions = await this.store.loadObject('option');
    // This setting is fixed and cannot be updated.
    if (prevOptions) {
      region = prevOptions?.region;
      vpcId = prevOptions?.vpcId;
      identifier = prevOptions?.identifier;
      engine = prevOptions?.engine;
      engineVersion = prevOptions?.engineVersion;
      dbSubnetGroupName = prevOptions?.dbSubnetGroupName;
      instanceClass = prevOptions?.instanceClass;
      username = prevOptions?.username;
      password = prevOptions?.password;
    }

    if (!region) throw new Error(`options 'Region' is required`);
    if (!vpcId) throw new Error(`options 'VPC ID' is required`);
    if (!engine) throw new Error(`options 'Engine(Database)' is required`);
    if (!dbSubnetGroupName) throw new Error(`options 'DB Subnet Group Name' is required`);
    if (!instanceClass) throw new Error(`options 'Instance Class' is required`);

    const options = {
      region,
      vpcId,
      identifier,
      engine,
      engineVersion,
      dbSubnetGroupName,
      instanceClass,
      username,
      password,
      // state: STATE.stopped,
      env
    } as RDS;

    await this.store.save('option', options);

    return options;

  }

  /**
   * AwsAppController.saveOutput
   * @param stream 
   * @param shell 
   * @param options 
   */
  public async saveOutput(stream: Duplex, shell: IShell, options?: RDS): Promise<void> {
    return;
  }

  /**
   * AwsAppController.saveDescribe
   * Called by start
   * Describe instances via the AwsRDSApi(aws sdk)
   * @param options 
   */
  public async saveDescribe(options: RDS) {

    const db_instance: DBInstance = await this.rdsApi.describe(options.region, options.identifier);

    await this.store.save('info',
      {
        db_instance,
        deployed: (db_instance.DBInstanceStatus === 'available') ? true : false,
      }
    );
  
  }

  /**
   * AppController.start
   * terraform apply 실행
   */
  public async start(): Promise<void> {

    logger.info(`[START]`, this.request);

    const options: RDS = await this.readOptions();
    await this.runApply(options);

    // start
    const status = await this.rdsApi.start(options.region, options.identifier);

    logger.info(`[START]Done`, this.request);
    await this.saveDescribe(options);

  }

  /**
   * AppController.stop
   * terraform apply 실행
   */
  public async stop(): Promise<void> {

    logger.info(`[STOP]`, this.request);

    const options: RDS = await this.readOptions();
    await this.rdsApi.stop(options.region, options.identifier);

    logger.info(`[STOP]Done`, this.request);
    await this.saveDescribe(options);

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

    const db_instance: DBInstance = info?.db_instance;

    // workload
    const workload = {
      kind: 'workload',
      name: options.identifier,
      displayName: options.identifier,
      replicas: info.deployed ? 1 : 0, // stop은 ....... 
      ready: info.deployed ? 1 : 0,
      instances: [
        {
          id: db_instance.DBInstanceIdentifier,
          status: db_instance.DBInstanceStatus,
          started: new Date(db_instance.InstanceCreateTime),
          // ip: 
        }
      ]
    } as DeployedWorkload;
    deployedObjects.push(workload);


    const domain = {
      kind: 'domain',
      name: options.identifier,
      entrypoints: [db_instance.Endpoint?.Address],
      // service: db_instance.DbInstancePort,
      servicePort: db_instance.Endpoint?.Port,
      status: 'bound',
      description: db_instance.Endpoint
    } as DeployedDomain;
    deployedObjects.push(domain);

    return deployedObjects;

  }

  /**
   * AppController.getStat
   * @returns 
   */
  public async getStat(): Promise<DeploymentStat> {

    const info = await this.store.loadObject('info');
    const option = await this.store.loadObject('option');

    const statObject = {
      region: option?.region,
      metric: 'cloudwatch',
      namespace: 'AWS/RDS',
      dimensionName: 'DBInstanceIdentifier',
      dimensionValue: info?.db_instance?.DBInstanceIdentifier,
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
        name: 'NetworkReceiveThroughput',
        title: 'NetworkReceiveThroughput',
        unit: 'Byte',
        // options: {
        //   mode: 'sum'
        // }
      },
      {
        name: 'NetworkTransmitThroughput',
        title: 'NetworkTransmitThroughput',
        unit: 'Byte',
        // options: {
        //   mode: 'sum'
        // }
      },
      {
        name: 'FreeStorageSpace',
        title: 'FreeStorageSpace',
        unit: 'Byte'
      },
      {
        name: 'DatabaseConnections',
        title: 'DatabaseConnections',
        unit: '',
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
      case 'FreeStorageSpace':
        metricData = await this.cloudwatchApi.getMetricData(name, Statistic.Average, metricObject, options);
        break;
      case 'NetworkReceiveThroughput': // rds
      case 'NetworkTransmitThroughput': // rds
        metricData = await this.cloudwatchApi.getMetricData(name, Statistic.Sum, metricObject, options);
        break;
      case 'DatabaseConnections': // rds
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


