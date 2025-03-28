import { DeployedObject, IShell, DeploymentStat, MetricItem, MetricData, MetricFilter } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex } from 'stream';
import { ECS } from './ECS';
/**
 * Requires a pre-existing ECS cluster (sg : All TCP & VPC CIDR )
 * Requires a pre-existing EFS to use the volume (sg : NFS 2049 & VPC CIDR)
 */
export default class AwsECSApp extends AwsAppController<ECS> {
    private readonly ecsApi;
    private readonly elbApi;
    private readonly CLUSTER_NAME;
    private readonly EFS_NAME;
    private readonly TASK_ROLE_NAME;
    /**
     * AwsAppController.getDirname
     * @returns
     */
    getDirname(): string;
    /**
     * AwsAppController.readOptions
     * @returns ECS
     */
    readOptions(): Promise<ECS>;
    /**
     * AwsAppController.saveOutput
     * @param stream
     * @param shell
     * @param options
     */
    saveOutput(stream: Duplex, shell: IShell, options?: ECS): Promise<void>;
    /**
     * AwsAppController.saveDescribe
     * Called by AwsAppController.start
     * Describe instances via the AwsECSApi & AwsELBApi(aws sdk)
     * @param region
     * @param identifier
     */
    saveDescribe(options: ECS): Promise<void>;
    /**
     * AppController.stop
     * terraform apply
     */
    stop(): Promise<void>;
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
    getMetric(name: string, options: MetricFilter): Promise<MetricData>;
}
