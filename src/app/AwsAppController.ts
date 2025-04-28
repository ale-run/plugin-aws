import { AnyObject, AppController, DeploymentStat, IDataStore, IShell, Logger, MetricData, MetricFilter, MetricItem, Plugin, SERVICE_STATUS } from '@ale-run/runtime';
import { AWS } from './AWS';
import { Duplex } from 'stream';
import fs from 'fs';
import path from 'path';
import template from 'es6-template-string';
import { AwsCloudwatchApi } from './AwsCloudwatchApi';
import { Statistic } from '@aws-sdk/client-cloudwatch';

const logger = Logger.getLogger('app:AwsAppController');

const PROVIDER = 'aws';
const TF_FILES = ['./terraform/main.tf', './terraform/outputs.tf', './terraform/variables.tf', './terraform/versions.tf']
const TFVARS_FILE = './terraform/terraform.tfvars';
// const TFPLAN_FILE = 'terraform.tfplan';
const TFSTATE_FILE = '.state/terraform.tfstate';
// const OUTPUT_FILE = 'output.json';
const SOURCE_DIR = 'source';


export abstract class AwsAppController<T extends AWS> extends AppController {

  public cloudwatchApi: AwsCloudwatchApi = new AwsCloudwatchApi();

  public abstract getDirname(): string;
  public abstract readOptions(): Promise<T>;
  /**
   * Called by apply 
   * instance information via the output of terraform apply
   * @param stream 
   * @param shell 
   * @param options 
   */
  public abstract saveOutput(stream: Duplex, shell: IShell, options?: T): Promise<void>;

  /**
   * Called by start or stop
   * instance information via API (aws sdk)
   * @param options 
   */
  public saveDescribe(options: T): Promise<void> {
    return;
  }

  /**
   * AppController.deploy
   * terraform plan 
   */
  public async deploy(): Promise<void> {

    logger.info(`[DEPLOY]`, this.request);
    //await this.store.save('status', SERVICE_STATUS.deploying);

    const options = await this.readOptions();
    await this.runPlan(options)

    logger.info(`[DEPLOY]done`, this.request.name);

  }


  /**
   * AppController.start
   * terraform apply
   */
  public async start(): Promise<void> {

    logger.info(`[START]`, this.request.name);
    await this.store.save('status', SERVICE_STATUS.starting);

    const options = await this.store.loadObject('option') as T;
    await this.runApply(options)

    logger.info(`[START]Done`, this.request.name);
    await this.store.save('status', SERVICE_STATUS.running);
    await this.saveDescribe(options);

  }

  /**
   * AppController.stop
   * This request is skipped
   */
  public async stop(): Promise<void> {

    logger.info(`[STOP]`, this.request.name);
    logger.info(`[STOP]This request is skipped`);
    // logger.info(`[STOP]Done`, this.request);
  }

  /**
   * AppController.destory
   * terraform destroy
   */
  public async destroy(): Promise<void> {

    logger.info(`[DESTROY]`, this.request.name);
    //await this.store.save('status', SERVICE_STATUS.undeploying);

    const options = await this.store.loadObject('option') as T;
    const output = await this.runDestroy(options);

    logger.info(`[DESTROY]Done`, this.request.name);

  }

  /**
   * AppController.getMetric
   * @param name 
   * @param options 
   * @returns 
   */
  public async getStatObject(metric?: string): Promise<AnyObject | undefined> {

    const metricName = metric || 'cloudwatch';
    const stat: DeploymentStat = await this.getStat();

    const objects: AnyObject[] = stat?.objects?.filter((o) => o.metric === metricName);
    if (objects?.length === 0) {
      logger.warn(`[METRIC][${this.deployment.name}] cloudwatch objects not found!`);
      return;
    }

    const object = objects[0];
    if (!object.dimensionValue) {
      logger.warn(`[METRIC][${this.deployment.name}] cloudwatch.dimensionValue not found!`);
      return;
    }

    logger.debug(`[METRIC][${this.deployment.name}] cloudwatch object=`, object);
    return object;
  }

  /**
   * terraform plan 
   * @param stream 
   * @param shell 
   * @param store 
   * @param plugin 
   * @param options 
   */
  public async runPlan(options: T): Promise<void> {

    const stream = await this.getStream();
    const shell = await this.getShell();
    const identifier = options.identifier;
    logger.info(`[PLAN][${identifier}]            ---------------------------`);

    try {
      // preparing
      await this.runReady(stream, shell, this.store, this.plugin, options);

      // plan
      await this.runCommand(stream, shell, `terraform plan`, identifier)
      logger.info(`[PLAN][${identifier}]Done        ---------------------------`);

    } catch (err) {
      await this.store.save('status', SERVICE_STATUS.error);
      logger.warn(`[PLAN][${identifier}]Error       ---------------------------`);
      logger.warn(err);
      throw err
    }

  }


  /**
   * terraform apply
   * @param stream 
   * @param shell 
   * @param store 
   * @param plugin 
   * @param options 
   */
  public async runApply(options: T): Promise<void> {

    const stream = await this.getStream();
    const shell = await this.getShell();
    const identifier = options.identifier;
    logger.info(`[APPLY][${identifier}]           ---------------------------`);

    try {

      // preparing
      await this.runReady(stream, shell, this.store, this.plugin, options);

      // apply 
      await this.runCommand(stream, shell, `terraform apply --auto-approve`, identifier)
      logger.info(`[APPLY][${identifier}]Done       ---------------------------`);

      // read & save output
      await this.saveOutput(stream, shell, options);

    } catch (err) {
      await this.store.save('status', SERVICE_STATUS.error);
      logger.warn(`[APPLY][${identifier}]Error      ---------------------------`);
      logger.warn(err);
      throw err
    } finally {
      // save terraform.tfsate
      // It must be saved even in case of failure.
      await this.saveState(shell, this.store);
    }

  }


  /**
   * terraform destroy 
   * @param stream 
   * @param shell 
   * @param store 
   * @param plugin 
   * @param options 
   */
  public async runDestroy(options: T): Promise<void> {

    const stream = await this.getStream();
    const shell = await this.getShell();
    const identifier = options.identifier;
    logger.info(`[DESTROY][${identifier}]         ---------------------------`);

    try {

      // preparing
      await this.runReady(stream, shell, this.store, this.plugin, options);

      // destroy
      await this.runCommand(stream, shell, `terraform destroy --auto-approve`, identifier)
      logger.info(`[DESTROY][${identifier}]Done     ---------------------------`);

    } catch (err) {
      await this.store.save('status', SERVICE_STATUS.error);
      logger.warn(`[DESTROY][${identifier}]Error    ---------------------------`);
      logger.warn(err);
      throw err
    } finally {
      // save terraform.tfsate
      // It must be saved even in case of failure.
      await this.saveState(shell, this.store);
    }

  }

  /**
   * preparing to the terraform command (plan, apply, destory)
   * @param stream 
   * @param shell 
   * @param store 
   * @param plugin 
   * @param options 
   */
  public async runReady(stream: Duplex, shell: IShell, store: IDataStore, plugin: Plugin, options: T): Promise<void> {

    // terraform file write 
    await this.writeTerraformFile(stream, shell, options);
    // export AWS key
    await this.exportEvn(stream, shell, plugin, options.env);
    // run init
    await this.runCommand(stream, shell, 'terraform init', options.identifier);
    // state file write
    await this.writeStateFile(stream, shell, store)
    // additional file write
    await this.writeAdditionalFile(stream, shell, store)

  }


  /**
   * generate a terraform file
   * @param stream 
   * @param shell 
   * @param dirname 
   * @param tfVarScript 
   * @param state 
   * @param plan 
   */
  async writeTerraformFile(stream: Duplex, shell: IShell, options: T): Promise<void> {

    logger.debug(`[WRITE][${options.identifier}]`);
    const dirname = this.getDirname();

    // file write ////////////////////////////////////////////////////////////////////////
    // file write to Agent(main.tf, ...)
    for (const filePath of TF_FILES) {
      const fileName = path.basename(filePath)
      stream.write(`- create file ${fileName}\n`);
      await shell.writeFile(`${fileName}`, fs.readFileSync(path.join(dirname, filePath)).toString());
    }
    // file write to Agent(terraform.tfvars)
    stream.write(`- create file "terraform.tfvars"\n`);
    const tfVarScript = template(fs.readFileSync(path.join(dirname, TFVARS_FILE)).toString(), options);
    await shell.writeFile(`terraform.tfvars`, tfVarScript);
    stream.write(`${tfVarScript}\n`); // sentitive values may be exposed
    // logger.info(`tfVars=`, tfVarScript); //sentitive values may be exposed

  }

  /**
   * export AccessKey
   * @param stream 
   * @param shell 
   * @param plugin 
   * @param env 
   */
  async exportEvn(stream: Duplex, shell: IShell, plugin?: Plugin, env?): Promise<void> {

    // logger.info(`exportEnv---------------------------------------------------------------`);

    // export ////////////////////////////////////////////////////////////////////////////
    // export AccessKey
    stream.write(`- setup credentials for ${PROVIDER}\n`);
    // set auto setup env from plugin options, if supported provider
    if (PROVIDER === 'aws') {
      const AWS_ACCESS_KEY_ID = plugin?.options?.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
      const AWS_SECRET_ACCESS_KEY = plugin?.options?.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

      if (!AWS_ACCESS_KEY_ID) throw new Error(`plugin.config.AWS_ACCESS_KEY_ID is required`);
      if (!AWS_ACCESS_KEY_ID) throw new Error(`plugin.config.AWS_SECRET_ACCESS_KEY is required`);

      // exec command
      await shell.exec(`export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"`);
      await shell.exec(`export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"`);

    } else if (!PROVIDER) {
      throw new Error(`unsuported provider: ${PROVIDER}`);
    }

    // export env
    // const exportCommands = Object.keys(env).map((key: string) => `export ${key}="${env[key] || ''}"`);
    // if (exportCommands?.length) await shell.exec(exportCommands.join('\n'));
  }


  /**
   * generate a terraform.tfstate file
   * @param stream 
   * @param shell 
   * @param state 
   * @param identifier 
   */
  async writeStateFile(stream: Duplex, shell: IShell, store: IDataStore): Promise<void> {

    const state = await store.load('tfstate');

    // restore previous tfstate if exist
    if (state) {
      stream.write(`- restore state file "${TFSTATE_FILE}"\n`);
      await shell.exec(`mkdir .state`);
      await shell.writeFile(TFSTATE_FILE, state);
    }

  }

  /**
   * if extra files are required for Terraform execution
   * @param stream 
   * @param shell 
   * @param store 
   */
  async writeAdditionalFile(stream: Duplex, shell: IShell, store: IDataStore): Promise<void> {

  }

  /**
   * running a command
   * @param stream 
   * @param shell 
   * @param command 
   * @param deploymentName 
   * @returns 
   */
  async runCommand(stream: Duplex, shell: IShell, command: string, identifier?: string): Promise<string> {
    const result = await shell.exec(`${command}`, { stream });
    // stream.write(result + '\n');
    // stream.write(`${command} Done! ---------------------------------\n`);

    return result;
  }

  /**
   * after apply or destory
   * save the terraform.tfstate file
   * @param shell 
   * @param store 
   */
  async saveState(shell: IShell, store: IDataStore): Promise<void> {
    const state = await shell.readFile(TFSTATE_FILE);
    if (state) {
      await store.save('tfstate', state);
    }
  }


 /**
  * get output
  * @param stream 
  * @param shell 
  * @param key 
  * @param identifier 
  * @returns 
  */
  public async getOutput(stream: Duplex, shell: IShell, key: string, identifier?: string): Promise<string> {

    try {
      let value = await this.runCommand(stream, shell, `terraform output --json ${key}`, identifier);
      value = value.trim();
      value = (value.startsWith('"') && value.endsWith('"')) ? value.substring(1, value.length - 1) : value;
      // logger.debug(`[${deploymentName}]${key}=${value}`);
      return value;
    } catch (err) {
      logger.warn(err);
    }
  }


}
