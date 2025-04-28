import { AnyObject, Logger, MetricData, MetricFilter } from '@ale-run/runtime';
import { CloudWatchClient, Datapoint, Dimension, GetMetricStatisticsCommand, GetMetricStatisticsCommandInput, StandardUnit, Statistic } from '@aws-sdk/client-cloudwatch';

const logger = Logger.getLogger('app:AwsCloudwatchApi');

export class AwsCloudwatchApi {


  /**
   * get MetricData
   * @param metricName 
   * @param statistic 
   * @param statObject 
   * @param options 
   * @returns 
   */
  public async getMetricData(metricName: string, statistic: Statistic, statObject: AnyObject, options: MetricFilter): Promise<MetricData> {
    const input = this.getCommandInput(metricName, [statistic], statObject, options);
    const datapoints = await this.getMetricStatistics(statObject.region, input);
    return this.toMetricData(statObject.identifier, datapoints)
  }


  /**
   * get S3 MetricData
   * @param metricName 
   * @param statistic 
   * @param statObject 
   * @param options 
   * @param storageType 
   * @returns 
   */
  public async getS3MetricData(metricName: string, statistic: Statistic, statObject: AnyObject, options: MetricFilter, storageType: string): Promise<MetricData> {

    const input = this.getCommandInput(metricName, [statistic], statObject, options);

    const dimension: Dimension = {
      Name: 'StorageType', // required
      Value: storageType, // required
    }

    input.Dimensions.push(dimension);

    const datapoints = await this.getMetricStatistics(statObject.region, input);
    return this.toMetricData(statObject.identifier, datapoints)
  }


  /**
   * get ECS MetricData 
   * @param metricName 
   * @param statistic 
   * @param statObject 
   * @param options 
   * @returns 
   */
  public async getECSMetricData(metricName: string, statistic: Statistic, statObject: AnyObject, options: MetricFilter): Promise<MetricData> {

    const input = this.getCommandInput(metricName, [statistic], statObject, options);

    const dimension: Dimension = {
      Name: 'ClusterName', // required
      Value: statObject.clusterName, // required
    }

    input.Dimensions.push(dimension);

    const datapoints = await this.getMetricStatistics(statObject.region, input);
    return this.toMetricData(statObject.identifier, datapoints)
  }


  /**
   * CPUUtilization MetricData
   * @param statObject 
   * @param options 
   * @returns 
   */
  public async getCPUUtilization(statObject: AnyObject, options: MetricFilter) {
    return this.getMetricData('CPUUtilization', Statistic.Average, statObject, options);
  }

  /**
   * NetworkIn MetricData
   * @param statObject 
   * @param options 
   * @returns 
   */
  public async getNetworkIn(statObject: AnyObject, options: MetricFilter) {
    return this.getMetricData('NetworkIn', Statistic.Sum, statObject, options);
  }

  /**
   * NetworkOut MetricData
   * @param statObject 
   * @param options 
   * @returns 
   */
  public async getNetworkOut(statObject: AnyObject, options: MetricFilter) {
    return this.getMetricData('NetworkIn', Statistic.Sum, statObject, options);
  }



  public async getMetricStatistics(region: string, input: GetMetricStatisticsCommandInput): Promise<Datapoint[]> | undefined {

    logger.info('[getMetricStatistics]input=', input);
    const client = this.getClient(region);

    try {

      const command = new GetMetricStatisticsCommand(input);
      const response = await client.send(command);
      logger.debug('[getMetricStatistics]metadata=', response.$metadata);
      logger.debug('[getMetricStatistics]Datapoints=', response.Datapoints);

      if (response.$metadata.httpStatusCode === 200) {
        // DataPoint를 시간순으로 정렬하기
        return response.Datapoints.sort((a, b): number => {
          return a.Timestamp.getTime() - b.Timestamp.getTime();
        });
      }

    } catch (err) {
      logger.error('getMetricStatistics Error ===============================================')
      logger.error(input)
      logger.error(err)

    } finally {
      client.destroy();
    }

    return undefined;


    // { // GetMetricStatisticsOutput
    //   Label: "STRING_VALUE",
    //   Datapoints: [ // Datapoints
    //     { // Datapoint
    //       Timestamp: new Date("TIMESTAMP"),
    //       SampleCount: Number("double"),
    //       Average: Number("double"),
    //       Sum: Number("double"),
    //       Minimum: Number("double"),
    //       Maximum: Number("double"),
    //       Unit: "Seconds" || "Microseconds" || "Milliseconds" || "Bytes" || "Kilobytes" || "Megabytes" || "Gigabytes" || "Terabytes" || "Bits" || "Kilobits" || "Megabits" || "Gigabits" || "Terabits" || "Percent" || "Count" || "Bytes/Second" || "Kilobytes/Second" || "Megabytes/Second" || "Gigabytes/Second" || "Terabytes/Second" || "Bits/Second" || "Kilobits/Second" || "Megabits/Second" || "Gigabits/Second" || "Terabits/Second" || "Count/Second" || "None",
    //       ExtendedStatistics: { // DatapointValueMap
    //         "<keys>": Number("double"),
    //       },
    //     },
    //   ],
    // };
  }

  private getClient(region: string): CloudWatchClient {
    const config = {
      region
    }
    const client = new CloudWatchClient(config)
    return client;

  }

  private getCommandInput(metricName: string, statistics: Statistic[], statObject: AnyObject, options: MetricFilter): GetMetricStatisticsCommandInput {

    const input = { // GetMetricStatisticsInput
      Namespace: statObject.namespace, // required
      MetricName: metricName, // required
      Dimensions: [ // Dimensions
        { // Dimension
          Name: statObject.dimensionName, // required
          Value: statObject.dimensionValue, // required
        },
      ],
      StartTime: options.from, // required
      EndTime: options.to, // required
      Period: this.toPeriod(options.interval), // required
      // Statistics: [ // Statistics
      //   "Average" || "Sum" || "Minimum" || "Maximum",
      // ],
      Statistics: statistics,
      // ExtendedStatistics: [ // ExtendedStatistics
      //   "STRING_VALUE",
      // ],
      // Unit: StandardUnit.Bytes_Second
      // Unit: "Seconds" || "Microseconds" || "Milliseconds" || "Bytes" || "Kilobytes" || "Megabytes" || "Gigabytes" || "Terabytes" || "Bits" || "Kilobits" || "Megabits" || "Gigabits" || "Terabits" || "Percent" || "Count" || "Bytes/Second" || "Kilobytes/Second" || "Megabytes/Second" || "Gigabytes/Second" || "Terabytes/Second" || "Bits/Second" || "Kilobits/Second" || "Megabits/Second" || "Gigabits/Second" || "Terabits/Second" || "Count/Second" || "None",
    };

    return input;

  }

  private toPeriod(unit: string) {

    const regex = new RegExp('([0-9]{0,2})(m|h|d)');
    const match = regex.exec(unit);
    const time: number = (match[1] !== '' ? Number(match[1]) : 1);
    const timeUnit = match[2];

    switch (timeUnit) {
      case 'm':
        return time * 60;
      case 'h':
        return time * 60 * 60;
      case 'd':
        return time * 24 * 60 * 60;
      default:
        return 10 * 60
    }

  }

  private toMetricData(identifier: string, datapoints: Datapoint[]) {

    if (datapoints === undefined || datapoints.length === 0) return;

    const dates = [];
    const values = [];

    for (const data of datapoints) {
      dates.push(data.Timestamp);

      if (data.Average) {
        values.push(data.Average);
      } else if (data.Sum) {
        values.push(data.Sum);
      } else if (data.Maximum) {
        values.push(data.Maximum);
      } else if (data.Minimum) {
        values.push(data.Minimum);
      } else {
        values.push(0);
      }

    }

    const item = {
      name: identifier,
      values
    }

    const metricData = {
      total: dates.length,
      dates,
      series: [item]
    }

    return metricData;
  }

}
