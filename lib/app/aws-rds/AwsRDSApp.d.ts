import { DeployedObject, IShell, DeploymentStat, MetricItem, MetricData, MetricFilter } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex } from 'stream';
import { RDS } from './RDS';
export default class AwsRDSApp extends AwsAppController<RDS> {
    private readonly rdsApi;
    /**
     * AwsAppController.getDirname
     * @returns
     */
    getDirname(): string;
    /**
     * AwsAppController.readOptions
     * @returns
     */
    readOptions(): Promise<RDS>;
    /**
     * AwsAppController.saveOutput
     * @param stream
     * @param shell
     * @param options
     */
    saveOutput(stream: Duplex, shell: IShell, options?: RDS): Promise<void>;
    /**
     * AwsAppController.saveDescribe
     * Called by start
     * Describe instances via the AwsRDSApi(aws sdk)
     * @param options
     */
    saveDescribe(options: RDS): Promise<void>;
    /**
     * AppController.start
     * terraform apply 실행
     */
    start(): Promise<void>;
    /**
     * AppController.stop
     * terraform apply 실행
     */
    stop(): Promise<void>;
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
