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
const runtime_1 = require("@ale-run/runtime");
const AwsAppController_1 = require("../AwsAppController");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const logger = runtime_1.Logger.getLogger('app:AwsS3App');
class AwsS3App extends AwsAppController_1.AwsAppController {
    /**
     * AwsAppController.getDirname
     * @returns
     */
    getDirname() {
        return __dirname;
    }
    /**
     * AwsAppController.readOptions
     * @returns
     */
    readOptions() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.    
            let region = this.request.options.region || ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.REGION);
            // Underscores ('_') are not allowed in Terraform
            let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
            const prevOptions = yield this.store.loadObject('option');
            // This setting is fixed and cannot be updated.
            if (prevOptions) {
                region = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.region;
                identifier = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.identifier;
            }
            if (!region)
                throw new Error(`options 'Region' is required`);
            const options = {
                region,
                identifier,
            };
            yield this.store.save('option', options);
            return options;
        });
    }
    /**
     * AwsAppController.saveOutput
     * @param stream
     * @param shell
     * @param options
     */
    saveOutput(stream, shell, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // output 
            const bucketId = yield this.getOutput(stream, shell, 'bucket_id');
            const bucketDomainName = yield this.getOutput(stream, shell, 'bucket_domain_name');
            // save
            yield this.store.save('info', {
                bucketId,
                bucketDomainName,
                deployed: true,
            });
        });
    }
    /**
     * AppController.list
     * @param kind
     * @returns
     */
    list(kind) {
        return __awaiter(this, void 0, void 0, function* () {
            const deployedObjects = [];
            const info = yield this.store.loadObject('info');
            if (!info)
                return deployedObjects;
            const options = yield this.store.loadObject('option');
            logger.info(`[LIST]`, this.request);
            logger.info(`[LIST][info]`, info);
            // workload
            const workload = {
                kind: 'workload',
                name: options.identifier,
                displayName: options.identifier,
                replicas: info.deployed ? 1 : 0,
                ready: info.deployed ? 1 : 0,
            };
            deployedObjects.push(workload);
            const domain = {
                kind: 'domain',
                name: options.identifier,
                entrypoints: [info === null || info === void 0 ? void 0 : info.bucketDomainName],
                // servicePort: 80,
                status: 'bound',
            };
            deployedObjects.push(domain);
            return deployedObjects;
        });
    }
    /**
     * AppController.getStat
     * @returns
     */
    getStat() {
        return __awaiter(this, void 0, void 0, function* () {
            const info = yield this.store.loadObject('info');
            const option = yield this.store.loadObject('option');
            const rds = {
                region: option === null || option === void 0 ? void 0 : option.region,
                metric: 'cloudwatch',
                namespace: 'AWS/S3',
                dimensionName: 'BucketName',
                dimensionValue: info === null || info === void 0 ? void 0 : info.bucketId,
                identifier: option.identifier
            };
            return {
                status: (info === null || info === void 0 ? void 0 : info.deployed) ? runtime_1.SERVICE_STATUS.running : runtime_1.SERVICE_STATUS.stopped,
                cpu: +(info === null || info === void 0 ? void 0 : info.cpu) || 0,
                memory: +(info === null || info === void 0 ? void 0 : info.cpu) || 0,
                disk: +(info === null || info === void 0 ? void 0 : info.cpu) || 0,
                replicas: (info === null || info === void 0 ? void 0 : info.deployed) ? 1 : 0,
                ready: (info === null || info === void 0 ? void 0 : info.deployed) ? 1 : 0,
                available: (info === null || info === void 0 ? void 0 : info.deployed) ? 1 : 0,
                unavailable: 0,
                entrypoints: (info === null || info === void 0 ? void 0 : info.endpoint)
                    ?
                        [
                            {
                                link: info.endpoint,
                                type: 'tcp'
                            }
                        ]
                    : null,
                exposes: [],
                objects: [rds],
                since: new Date(info === null || info === void 0 ? void 0 : info.launch_time)
            };
        });
    }
    /**
     * AppController.getMetricItems
     * @returns
     */
    getMetricItems() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    name: 'BucketSizeBytes',
                    title: 'BucketSizeBytes',
                    unit: 'Byte'
                },
                {
                    name: 'NumberOfObjects',
                    title: 'NumberOfObjects',
                    unit: 'Count'
                },
            ];
        });
    }
    /**
     * AppController.getMetric
     * @param name
     * @param options
     * @returns
     */
    getMetric(name, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // aws cloudwatch list-metrics --region ap-northeast-2 --namespace AWS/S3
            const metricObject = yield this.getStatObject();
            if (metricObject === undefined)
                return;
            let metricData = null;
            switch (name) {
                case 'BucketSizeBytes':
                    metricData = yield this.cloudwatchApi.getS3MetricData(name, client_cloudwatch_1.Statistic.Average, metricObject, options, 'StandardStorage');
                    break;
                case 'NumberOfObjects':
                    metricData = yield this.cloudwatchApi.getS3MetricData(name, client_cloudwatch_1.Statistic.Maximum, metricObject, options, 'AllStorageTypes');
                    break;
                default:
                    logger.warn(`[METRIC][${this.deployment.name}] undefined metric item '${name}'`);
                    return;
            }
            logger.info(`[METRIC]`, metricData);
            return metricData;
        });
    }
}
exports.default = AwsS3App;
//# sourceMappingURL=AwsS3App.js.map