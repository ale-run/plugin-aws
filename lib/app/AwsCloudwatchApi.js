"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsCloudwatchApi = void 0;
const runtime_1 = require("@ale-run/runtime");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const logger = runtime_1.Logger.getLogger('app:AwsCloudwatchApi');
class AwsCloudwatchApi {
    /**
     * get MetricData
     * @param metricName
     * @param statistic
     * @param statObject
     * @param options
     * @returns
     */
    getMetricData(metricName, statistic, statObject, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const input = this.getCommandInput(metricName, [statistic], statObject, options);
            const datapoints = yield this.getMetricStatistics(statObject.region, input);
            return this.toMetricData(statObject.identifier, datapoints);
        });
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
    getS3MetricData(metricName, statistic, statObject, options, storageType) {
        return __awaiter(this, void 0, void 0, function* () {
            const input = this.getCommandInput(metricName, [statistic], statObject, options);
            const dimension = {
                Name: 'StorageType', // required
                Value: storageType, // required
            };
            input.Dimensions.push(dimension);
            const datapoints = yield this.getMetricStatistics(statObject.region, input);
            return this.toMetricData(statObject.identifier, datapoints);
        });
    }
    /**
     * get ECS MetricData
     * @param metricName
     * @param statistic
     * @param statObject
     * @param options
     * @returns
     */
    getECSMetricData(metricName, statistic, statObject, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const input = this.getCommandInput(metricName, [statistic], statObject, options);
            const dimension = {
                Name: 'ClusterName', // required
                Value: statObject.clusterName, // required
            };
            input.Dimensions.push(dimension);
            const datapoints = yield this.getMetricStatistics(statObject.region, input);
            return this.toMetricData(statObject.identifier, datapoints);
        });
    }
    /**
     * CPUUtilization MetricData
     * @param statObject
     * @param options
     * @returns
     */
    getCPUUtilization(statObject, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getMetricData('CPUUtilization', client_cloudwatch_1.Statistic.Average, statObject, options);
        });
    }
    /**
     * NetworkIn MetricData
     * @param statObject
     * @param options
     * @returns
     */
    getNetworkIn(statObject, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getMetricData('NetworkIn', client_cloudwatch_1.Statistic.Sum, statObject, options);
        });
    }
    /**
     * NetworkOut MetricData
     * @param statObject
     * @param options
     * @returns
     */
    getNetworkOut(statObject, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getMetricData('NetworkIn', client_cloudwatch_1.Statistic.Sum, statObject, options);
        });
    }
    getMetricStatistics(region, input) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info('[getMetricStatistics]input=', input);
            const client = this.getClient(region);
            try {
                const command = new client_cloudwatch_1.GetMetricStatisticsCommand(input);
                const response = yield client.send(command);
                logger.debug('[getMetricStatistics]metadata=', response.$metadata);
                logger.debug('[getMetricStatistics]Datapoints=', response.Datapoints);
                if (response.$metadata.httpStatusCode === 200) {
                    // DataPoint를 시간순으로 정렬하기
                    return response.Datapoints.sort((a, b) => {
                        return a.Timestamp.getTime() - b.Timestamp.getTime();
                    });
                }
            }
            catch (err) {
                logger.error('getMetricStatistics Error ===============================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
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
        });
    }
    getClient(region) {
        const config = {
            region
        };
        const client = new client_cloudwatch_1.CloudWatchClient(config);
        return client;
    }
    getCommandInput(metricName, statistics, statObject, options) {
        const input = {
            Namespace: statObject.namespace, // required
            MetricName: metricName, // required
            Dimensions: [
                {
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
    toPeriod(unit) {
        const regex = new RegExp('([0-9]{0,2})(m|h|d)');
        const match = regex.exec(unit);
        const time = (match[1] !== '' ? Number(match[1]) : 1);
        const timeUnit = match[2];
        switch (timeUnit) {
            case 'm':
                return time * 60;
            case 'h':
                return time * 60 * 60;
            case 'd':
                return time * 24 * 60 * 60;
            default:
                return 10 * 60;
        }
    }
    toMetricData(identifier, datapoints) {
        if (datapoints === undefined || datapoints.length === 0)
            return;
        const dates = [];
        const values = [];
        for (const data of datapoints) {
            dates.push(data.Timestamp);
            if (data.Average) {
                values.push(data.Average);
            }
            else if (data.Sum) {
                values.push(data.Sum);
            }
            else if (data.Maximum) {
                values.push(data.Maximum);
            }
            else if (data.Minimum) {
                values.push(data.Minimum);
            }
            else {
                values.push(0);
            }
        }
        const item = {
            name: identifier,
            values
        };
        const metricData = {
            total: dates.length,
            dates,
            series: [item]
        };
        return metricData;
    }
}
exports.AwsCloudwatchApi = AwsCloudwatchApi;
//# sourceMappingURL=AwsCloudwatchApi.js.map