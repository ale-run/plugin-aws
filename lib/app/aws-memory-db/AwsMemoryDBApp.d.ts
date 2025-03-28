import { DeployedObject, IShell, DeploymentStat, MetricItem, MetricData, MetricFilter } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex } from 'stream';
import { MemoryDB } from './MemoryDB';
export default class AwsMemoryDBApp extends AwsAppController<MemoryDB> {
    private readonly memroyDBApi;
    /**
     * AwsAppController.getDirname
     * @returns
     */
    getDirname(): string;
    /**
     * AwsAppController.readOptions
     * @returns
     */
    readOptions(): Promise<MemoryDB>;
    /**
     * AwsAppController.saveOutput
     * Called by AwsAppController.runApply
     * @param stream
     * @param shell
     * @param options
     */
    saveOutput(stream: Duplex, shell: IShell, options?: MemoryDB): Promise<void>;
    /**
     * AwsAppController.saveDescribe
     * Called by AwsAppController.start
     * Describe instances via the AwsMemroyDBApi(aws sdk)
     * @param options
     */
    saveDescribe(options: MemoryDB): Promise<void>;
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
     * https://docs.aws.amazon.com/ko_kr/memorydb/latest/devguide/metrics.memorydb.html
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
