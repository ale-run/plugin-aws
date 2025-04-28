import { DeployedObject, IShell, DeploymentStat, MetricItem, MetricData, MetricFilter, AnyObject } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex, Readable, Writable } from 'stream';
import { EC2 } from './EC2';
export default class AwsEC2App extends AwsAppController<EC2> {
    private readonly ec2Api;
    /**
     * AwsAppController.getDirname
     * @returns
     */
    getDirname(): string;
    /**
     * AwsAppController.readOptions
     * @returns EC2
     */
    readOptions(): Promise<EC2>;
    /**
     * AwsAppController.saveOutput
     * @param stream
     * @param shell
     * @param options
     */
    saveOutput(stream: Duplex, shell: IShell, options?: EC2): Promise<void>;
    private savePem;
    /**
     * AppController.start
     * terraform apply
     */
    start(): Promise<void>;
    /**
     * AppController.stop
     * terraform apply
     */
    stop(): Promise<void>;
    /**
     * SSH connect config
     * @returns
     */
    private getConnectConfig;
    /**
     * AppController.attach
     * Termianl
     * @param id
     * @param options
     * @returns
     */
    attach(id: string, options?: AnyObject): Promise<{
        stdin: Writable;
        stdout: Readable;
        stderr: Readable;
    }>;
    /**
     * AppController.list
     * @param type
     * @returns
     */
    list(kind?: string): Promise<DeployedObject[]>;
    /**
     * AppController.getStat
     * @returns
     */
    getStat(): Promise<DeploymentStat>;
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
    getMetric(name: string, options: MetricFilter): Promise<MetricData>;
    private getDefaultUsername;
}
