import { DeployedObject, IShell, Logger, SERVICE_STATUS, DeployedWorkload, DeployedWorkloadInstance, DeployedIngress, DeployedDomain, DeploymentStat, MetricItem, MetricData, MetricFilter, IDataStore, AnyObject, sleep, DeployedExpose } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex, PassThrough, Readable } from 'stream';
import { Lambda } from './Lambda';
import { Statistic } from '@aws-sdk/client-cloudwatch';
import path from 'path';
import { StartLiveTailCommandOutput } from '@aws-sdk/client-cloudwatch-logs';
import { AwsCloudwatchLogApi } from '../AwsCloudwatchLogApi';

const logger = Logger.getLogger('app:AwsLambdaApp');
const SOURCE_DIR = 'source';


export default class AwsLambdaApp extends AwsAppController<Lambda> {

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
  public async readOptions(): Promise<Lambda> {

    // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
    let region = this.request.options.region || this.plugin?.options?.REGION;

    // Underscores ('_') are not allowed in Terraform
    let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
    let runtime = this.request.options.runtime;
    let sourceFileName = this.request.options.sourceFileName;
    const inputParameter = this.request.options.inputParameter;
    const env = this.resolveEnv(this.request.options?.env);

    // inputParameter to {key=value}
    let input = '';
    if (inputParameter && inputParameter.length > 0) {
      for (const p of inputParameter) {
        input += `"${p.name}"="${p.value}",`
      }

      input = input.substring(0, input.length - 1);
    }

    const prevOptions = await this.store.loadObject('option');
    // This setting is fixed and cannot be updated.
    if (prevOptions) {
      region = prevOptions?.region;
      identifier = prevOptions?.identifier;
      runtime = prevOptions?.runtime;
      sourceFileName = prevOptions?.sourceFileName;
    }

    if (!region) throw new Error(`options 'Region' is required`);
    if (!runtime) throw new Error(`options 'Runtime Language' is required`);
    if (!sourceFileName) throw new Error(`options 'source File Name' is required`);

    const options = {
      region,
      identifier,
      runtime,
      sourceDir: SOURCE_DIR,
      sourceFileName,
      input,
      env
    } as Lambda;

    await this.store.save('option', options);

    return options;
  }

  /**
   * AwsAppController.saveOutput
   * @param stream 
   * @param shell 
   * @param options 
   */
  public async saveOutput(stream: Duplex, shell: IShell, options?: Lambda): Promise<void> {

    // output 
    const functionName = await this.getOutput(stream, shell, 'function_name');
    const runtime = await this.getOutput(stream, shell, 'runtime');
    const lastModified = await this.getOutput(stream, shell, 'last_modified');
    const logGroupArn = await this.getOutput(stream, shell, 'log_group_arn');
    const functionUrl = await this.getOutput(stream, shell, 'function_url');
    const authorizationType = await this.getOutput(stream, shell, 'authorization_type');

    const result = await this.getOutput(stream, shell, 'result');

    // save
    await this.store.save('info',
      {
        functionName,
        runtime,
        lastModified,
        logGroupArn,
        functionUrl,
        authorizationType,
        result,
        deployed: true,
      }
    );
  }

  /**
   * AppController.deploy
   * terraform plan 실행
   */
  public async deploy(): Promise<void> {

    logger.info(`[DEPLOY]`, this.request);

    const options: Lambda = await this.readOptions();
    // read & save Source
    const source = await this.readSource(options);

    await this.runPlan(options)

    logger.info(`[DEPLOY]done`, this.request);

  }


  /**
   * AppController.stop
   * 
   */
  public async stop(): Promise<void> {
    logger.info(`[STOP]`, this.request);
    logger.info(`[STOP]This request is skipped`);
    // logger.info(`[STOP]Done`, this.request);
  }

  private async readSource(option: Lambda): Promise<string> {
    // {
    //   "name":"lambda-test",
    //   "app":"aws-lambda",
    //   "context":
    //   {
    //     "git":
    //     {
    //       "url":"https://github.com//lambda-test.git",
    //       "branch":"main"
    //     },
    //     "preset":"aws-lambda"
    //   }
    // } 

    const stream = await this.getStream();
    const shell = await this.getShell();

    const git = Object.assign({}, (this.request.context && this.request.context.git) || {}, (this.request.options && this.request.options.git) || {});
    if (!git || !git.url) throw new Error(`options.git is required`);

    // git clone
    const gitResult = await shell.clone('repo', git.url, { branch: git.branch });
    stream.write('git clone: ' + JSON.stringify(gitResult, null, 2) + '\n');
    // read sourceCode
    const sourceCode = await shell.readFile(path.join('repo', option.sourceFileName), { stream });
    // save sourceCode
    await this.store.save('source', sourceCode);

    return sourceCode;
  }

  /**
   * AwsAppController.writeAdditionalFile 
   * @param stream 
   * @param shell 
   * @param store 
   */
  public async writeAdditionalFile(stream: Duplex, shell: IShell, store: IDataStore): Promise<void> {

    const sourceDir = 'source';
    const sourceFileName = 'index.js';
    const source = await store.load('source');

    if (source) {
      stream.write(`- create file "${sourceDir}/${sourceFileName}"\n`);
      await shell.exec(`mkdir ${sourceDir}`);
      await shell.writeFile(path.join(sourceDir, sourceFileName), source);
    }

  }

  /**
   * AppController.logs
   * log tail via AwsCloudwatchLogApi(aws sdk)
   * @param id 
   * @param options 
   * @returns 
   */
  public async logs(id?: string, options?: AnyObject): Promise<Readable> {

    const stream = new PassThrough();

    const op = await this.store.loadObject('option');
    const info = await this.store.loadObject('info');
    if (!info) {
      logger.info('cloudwatch log group not ready! Please try again later');
      stream.write('cloudwatch log group not ready! Please try again later');
      stream.end();
      return stream;
    }

    const region = op?.region;
    const arn = info?.logGroupArn;
    
    const logApi = new AwsCloudwatchLogApi(region, arn, stream);
    await logApi.getLogs();
    logApi.startLiveTail();
    return stream;
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


    // workload(function 정보)
    const workload: DeployedWorkload = {
      kind:         'workload',
      name:         options.identifier,
      displayName:  options.identifier,
      // runtime:      info?.runtime,
      // lastModified: info?.lastModified,
      description:  {runtime: info?.runtime, lastModified: info?.lastModified},
      replicas: info?.deployed ? 1 : 0,
      ready: info?.deployed ? 1 : 0
    } as DeployedWorkload;
    deployedObjects.push(workload);


    // function url 정보
    const ingress: DeployedIngress = {
      kind:         'ingress',
      name:         info?.functionName,
      type:         'https',
      entrypoints: [info?.functionUrl],
      description: {authorizationType: info?.authorizationType}
    }
    deployedObjects.push(ingress);


    return deployedObjects;
  }

  /**
   * AppController.getStat
   * @returns 
   */
  public async getStat(): Promise<DeploymentStat> {

    const info = await this.store.loadObject('info');
    if (!info) return;
    const option = await this.store.loadObject('option');

    const statObject = {
      region: option?.region,
      metric: 'cloudwatch',
      namespace: 'AWS/Lambda',
      dimensionName: 'FunctionName',
      dimensionValue: info?.functionName,
      identifier: option?.identifier
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
        name: 'Invocations',
        title: 'Invocations',
        unit: ''
      },
      {
        name: 'Duration',
        title: 'Duration',
        unit: 'Milliseconds'
      },
      {
        name: 'Errors',
        title: 'Errors',
        unit: ''
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

    const metricObject = await this.getStatObject();
    if (metricObject === undefined) return;

    let metricData = null;

    switch (name) {
      case 'Duration':
        metricData = await this.cloudwatchApi.getMetricData(name, Statistic.Average, metricObject, options);
        break;
      case 'Invocations':
      case 'Errors':
        metricData = await this.cloudwatchApi.getMetricData(name, Statistic.Maximum, metricObject, options);
        break;
    }

    logger.info(`[METRIC]`, metricData);
    return metricData;
  }

}
