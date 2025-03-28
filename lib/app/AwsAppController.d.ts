import { AnyObject, AppController, IDataStore, IShell, MetricData, MetricFilter, MetricItem, Plugin } from '@ale-run/runtime';
import { AWS } from './AWS';
import { Duplex } from 'stream';
import { AwsCloudwatchApi } from './AwsCloudwatchApi';
export declare abstract class AwsAppController<T extends AWS> extends AppController {
    cloudwatchApi: AwsCloudwatchApi;
    abstract getDirname(): string;
    abstract readOptions(): Promise<T>;
    /**
     * Called by apply
     * instance information via the output of terraform apply
     * @param stream
     * @param shell
     * @param options
     */
    abstract saveOutput(stream: Duplex, shell: IShell, options?: T): Promise<void>;
    /**
     * Called by start
     * instance information via API (aws sdk)
     * @param options
     */
    saveDescribe(options: T): Promise<void>;
    /**
     * AppController.deploy
     * terraform plan
     */
    deploy(): Promise<void>;
    /**
     * AppController.start
     * terraform apply
     */
    start(): Promise<void>;
    /**
     * AppController.stop
     * terraform apply 실행
     */
    stop(): Promise<void>;
    /**
     * AppController.destory
     * terraform destroy
     */
    destroy(): Promise<void>;
    /**
     * AppController.getMetricItems
     * @returns
     */
    getMetricItems(): Promise<MetricItem[]>;
    /**
     * AppController.getMetric
     * @param name
     * @param options
     * @returns
     */
    getStatObject(metric?: string): Promise<AnyObject | undefined>;
    /**
     * AppController.getMetric
     * @param name
     * @param options
     * @returns
     */
    getMetric(name: string, options: MetricFilter): Promise<MetricData>;
    /**
     * terraform plan
     * @param stream
     * @param shell
     * @param store
     * @param plugin
     * @param options
     */
    runPlan(options: T): Promise<void>;
    /**
     * terraform apply
     * @param stream
     * @param shell
     * @param store
     * @param plugin
     * @param options
     */
    runApply(options: T): Promise<void>;
    /**
     * terraform destroy
     * @param stream
     * @param shell
     * @param store
     * @param plugin
     * @param options
     */
    runDestroy(options: T): Promise<void>;
    /**
     * preparing to the terraform command (plan, apply, destory)
     * @param stream
     * @param shell
     * @param store
     * @param plugin
     * @param options
     */
    runReady(stream: Duplex, shell: IShell, store: IDataStore, plugin: Plugin, options: T): Promise<void>;
    /**
     * generate a terraform file
     * @param stream
     * @param shell
     * @param dirname
     * @param tfVarScript
     * @param state
     * @param plan
     */
    writeTerraformFile(stream: Duplex, shell: IShell, options: T): Promise<void>;
    /**
     * export AccessKey
     * @param stream
     * @param shell
     * @param plugin
     * @param env
     */
    exportEvn(stream: Duplex, shell: IShell, plugin?: Plugin, env?: any): Promise<void>;
    /**
     * generate a terraform.tfstate file
     * @param stream
     * @param shell
     * @param state
     * @param identifier
     */
    writeStateFile(stream: Duplex, shell: IShell, store: IDataStore): Promise<void>;
    /**
     * if extra files are required for Terraform execution
     * @param stream
     * @param shell
     * @param store
     */
    writeAdditionalFile(stream: Duplex, shell: IShell, store: IDataStore): Promise<void>;
    /**
     * running a command
     * @param stream
     * @param shell
     * @param command
     * @param deploymentName
     * @returns
     */
    runCommand(stream: Duplex, shell: IShell, command: string, identifier?: string): Promise<string>;
    /**
     * after apply or destory
     * save the terraform.tfstate file
     * @param shell
     * @param store
     */
    saveState(shell: IShell, store: IDataStore): Promise<void>;
    /**
     * get output
     * @param stream
     * @param shell
     * @param key
     * @param identifier
     * @returns
     */
    getOutput(stream: Duplex, shell: IShell, key: string, identifier?: string): Promise<string>;
}
