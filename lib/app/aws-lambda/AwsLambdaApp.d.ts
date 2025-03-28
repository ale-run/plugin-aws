import { DeployedObject, IShell, DeploymentStat, MetricItem, MetricData, MetricFilter, IDataStore, AnyObject } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex, Readable } from 'stream';
import { Lambda } from './Lambda';
export default class AwsLambdaApp extends AwsAppController<Lambda> {
    /**
     * AwsAppController.getDirname
     * @returns
     */
    getDirname(): string;
    /**
     * AwsAppController.readOptions
     * @returns
     */
    readOptions(): Promise<Lambda>;
    /**
     * AwsAppController.saveOutput
     * @param stream
     * @param shell
     * @param options
     */
    saveOutput(stream: Duplex, shell: IShell, options?: Lambda): Promise<void>;
    /**
     * AppController.deploy
     * terraform plan 실행
     */
    deploy(): Promise<void>;
    /**
     * AppController.stop
     *
     */
    stop(): Promise<void>;
    private readSource;
    /**
     * AwsAppController.writeAdditionalFile
     * @param stream
     * @param shell
     * @param store
     */
    writeAdditionalFile(stream: Duplex, shell: IShell, store: IDataStore): Promise<void>;
    /**
     * AppController.logs
     * log tail via AwsCloudwatchLogApi(aws sdk)
     * @param id
     * @param options
     * @returns
     */
    logs(id?: string, options?: AnyObject): Promise<Readable>;
    /**
     * AppController.list
     * @param kind
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
}
