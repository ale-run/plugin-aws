import { DeployedObject, IShell, Logger, SERVICE_STATUS, DeployedWorkload, DeployedWorkloadInstance, DeployedIngress, DeployedDomain, DeploymentStat, MetricItem, MetricData, MetricFilter } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex } from 'stream';
import { Statistic } from '@aws-sdk/client-cloudwatch'
import { S3 } from './S3';


const logger = Logger.getLogger('app:AwsS3App');


export default class AwsS3App extends AwsAppController<S3> {

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
  public async readOptions(): Promise<S3> {

    // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.    
    let region = this.request.options.region || this.plugin?.options?.REGION;

    // Underscores ('_') are not allowed in Terraform
    let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;

    const prevOptions = await this.store.loadObject('option');
    // This setting is fixed and cannot be updated.
    if (prevOptions) {
      region = prevOptions?.region;
      identifier = prevOptions?.identifier;
    }

    if (!region) throw new Error(`options 'Region' is required`);

    const options = {
      region,
      identifier,
    } as S3;

    await this.store.save('option', options);

    return options;
  }

  /**
   * AwsAppController.saveOutput
   * @param stream 
   * @param shell 
   * @param options 
   */
  public async saveOutput(stream: Duplex, shell: IShell, options?: S3): Promise<void> {

    // output 
    const bucketId = await this.getOutput(stream, shell, 'bucket_id');
    const bucketDomainName = await this.getOutput(stream, shell, 'bucket_domain_name');

    // save
    await this.store.save('info',
      {
        bucketId,
        bucketDomainName,
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
    const status = await this.store.load('status');

    // workload
    const workload = {
      kind: 'workload',
      name: options.identifier,
      displayName: options.identifier,
      replicas: status === 'running' ? 1 : 0,
      ready: status === 'running' ? 1 : 0,
    } as DeployedWorkload;
    deployedObjects.push(workload);

    // domainName
    const ingress = {
      kind: 'ingress',
      name: options.identifier,
      type: 'tcp',
      entrypoints: [info?.bucketDomainName],
      // servicePort: 80,
      status: 'bound',
      // description: 'description'
    } as DeployedIngress;
    deployedObjects.push(ingress);

    // const domain = {
    //   kind: 'domain',
    //   name: options?.identifier,
    //   entrypoints: [info?.bucketDomainName],
    //   // servicePort: 80,
    //   status: 'bound',
    // } as DeployedDomain;
    // deployedObjects.push(domain);

    return deployedObjects;

  }

  /**
   * AppController.getStat
   * @returns 
   */
  public async getStat(): Promise<DeploymentStat> {

    const info = await this.store.loadObject('info');
    const option = await this.store.loadObject('option') as S3;
    const status = await this.store.load('status');

    const statObject = {
      region: option?.region,
      metric: 'cloudwatch',
      namespace: 'AWS/S3',
      dimensionName: 'BucketName',
      dimensionValue: info?.bucketId,
      identifier: option?.identifier
    }

    return {
      status: SERVICE_STATUS[status],
      objects: [statObject],
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

  /**
   * AppController.getMetricItems
   * @returns 
   */
  public async getMetricItems(): Promise<MetricItem[]> {

    return [
      {
        name: 'BucketSizeBytes',
        title: 'BucketSizeBytes',
        unit: 'Byte'
      },
      {
        name: 'NumberOfObjects',
        title: 'NumberOfObjects',
        unit: 'Count'
      },
    ]
  }

  /**
   * AppController.getMetric
   * @param name 
   * @param options 
   * @returns 
   */
  public async getMetric(name: string, options: MetricFilter): Promise<MetricData> {

    // aws cloudwatch list-metrics --region ap-northeast-2 --namespace AWS/S3


    const metricObject = await this.getStatObject();
    if (metricObject === undefined) return;

    let metricData = null;

    switch (name) {
      case 'BucketSizeBytes':
        metricData = await this.cloudwatchApi.getS3MetricData(name, Statistic.Average, metricObject, options, 'StandardStorage');
        break;
      case 'NumberOfObjects':
        metricData = await this.cloudwatchApi.getS3MetricData(name, Statistic.Maximum, metricObject, options, 'AllStorageTypes');
        break;
      default:
        logger.warn(`[METRIC][${this.deployment.name}] undefined metric item '${name}'`);
        return;
    }

    logger.info(`[METRIC]`, metricData);
    return metricData;
  }


}
