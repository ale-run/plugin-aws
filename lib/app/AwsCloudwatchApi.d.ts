import { AnyObject, MetricData, MetricFilter } from '@ale-run/runtime';
import { Datapoint, GetMetricStatisticsCommandInput, Statistic } from '@aws-sdk/client-cloudwatch';
export declare class AwsCloudwatchApi {
    /**
     * get Metric
     * @param metricName
     * @param statistic
     * @param statObject
     * @param options
     * @returns
     */
    getMetricData(metricName: string, statistic: Statistic, statObject: AnyObject, options: MetricFilter): Promise<MetricData>;
    /**
     * get S3 MetricData
     * @param metricName
     * @param statistic
     * @param statObject
     * @param options
     * @param storageType
     * @returns
     */
    getS3MetricData(metricName: string, statistic: Statistic, statObject: AnyObject, options: MetricFilter, storageType: string): Promise<MetricData>;
    /**
     * get ECS MetricData
     * @param metricName
     * @param statistic
     * @param statObject
     * @param options
     * @returns
     */
    getECSMetricData(metricName: string, statistic: Statistic, statObject: AnyObject, options: MetricFilter): Promise<MetricData>;
    /**
     * CPUUtilization
     * EC2, RDS
     * @param statObject
     * @param options
     * @returns
     */
    getCPUUtilization(statObject: AnyObject, options: MetricFilter): Promise<{
        total: number;
        dates: any[];
        series: {
            name: string;
            values: any[];
        }[];
    }>;
    /**
     * EC2
     * @param statObject
     * @param options
     * @returns
     */
    getNetworkIn(statObject: AnyObject, options: MetricFilter): Promise<{
        total: number;
        dates: any[];
        series: {
            name: string;
            values: any[];
        }[];
    }>;
    /**
     * EC2
     * @param statObject
     * @param options
     * @returns
     */
    getNetworkOut(statObject: AnyObject, options: MetricFilter): Promise<{
        total: number;
        dates: any[];
        series: {
            name: string;
            values: any[];
        }[];
    }>;
    getMetricStatistics(region: string, input: GetMetricStatisticsCommandInput): Promise<Datapoint[]> | undefined;
    private getClient;
    private getCommandInput;
    private toPeriod;
    private toMetricData;
}
