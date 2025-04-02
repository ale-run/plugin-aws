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
const AwsMemroyDBApi_1 = require("./AwsMemroyDBApi");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const logger = runtime_1.Logger.getLogger('app:AwsMemoryDBApp');
class AwsMemoryDBApp extends AwsAppController_1.AwsAppController {
    constructor() {
        super(...arguments);
        this.memroyDBApi = new AwsMemroyDBApi_1.AwsMemroyDBApi();
    }
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
            var _a, _b, _c, _d, _e, _f;
            // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
            let region = this.request.options.region || ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.REGION);
            // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.    
            let vpcId = this.request.options.vpcId || ((_d = (_c = this.plugin) === null || _c === void 0 ? void 0 : _c.options) === null || _d === void 0 ? void 0 : _d.VPC_ID);
            // Underscores ('_') are not allowed in Terraform
            let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
            const array = this.request.options.engine.split(' ', 2);
            let engine = array[0];
            let engineVersion = array[1];
            const subnets = this.request.options.subnetIds;
            let subnetIds = subnets ? subnets.trim().split(',') : [];
            let subnetGroupName = ((_e = this.request.options.subnetGroupName) === null || _e === void 0 ? void 0 : _e.trim()) || '';
            let instanceClass = this.request.options.instanceClass;
            const env = this.resolveEnv((_f = this.request.options) === null || _f === void 0 ? void 0 : _f.env);
            const prevOptions = yield this.store.loadObject('option');
            // This setting is fixed and cannot be updated.
            if (prevOptions) {
                region = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.region;
                vpcId = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.vpcId;
                identifier = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.identifier;
                engine = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.engine;
                engineVersion = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.engineVersion;
                subnetIds = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.subnetIds;
                subnetGroupName = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.subnetGroupName;
                instanceClass = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.instanceClass;
            }
            if (!region)
                throw new Error(`options 'Region' is required`);
            if (!vpcId)
                throw new Error(`options 'VPC ID' is required`);
            if (!engine)
                throw new Error(`options 'Engine(Database)' is required`);
            if (!subnetGroupName && !subnets)
                throw new Error(`options 'DB Subnet GRoup Name' or 'Subnet IDs' is required`);
            if (!instanceClass)
                throw new Error(`options 'Instance Class' is required`);
            const options = {
                region,
                vpcId,
                identifier,
                engine,
                engineVersion,
                subnetIds,
                subnetGroupName,
                instanceClass,
                env
            };
            yield this.store.save('option', options);
            return options;
        });
    }
    /**
     * AwsAppController.saveOutput
     * Called by AwsAppController.runApply
     * @param stream
     * @param shell
     * @param options
     */
    saveOutput(stream, shell, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    /**
     * AwsAppController.saveDescribe
     * Called by AwsAppController.start
     * Describe instances via the AwsMemroyDBApi(aws sdk)
     * @param options
     */
    saveDescribe(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cluster = yield this.memroyDBApi.describe(options.region, options.identifier);
            yield this.store.save('info', {
                cluster,
                deployed: ((cluster === null || cluster === void 0 ? void 0 : cluster.Status) === 'available') ? true : false,
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
            var _a, _b;
            const deployedObjects = [];
            const info = yield this.store.loadObject('info');
            if (!info)
                return deployedObjects;
            const options = yield this.store.loadObject('option');
            logger.info(`[LIST]`, this.request);
            logger.info(`[LIST][info]`, info);
            const cluster = info === null || info === void 0 ? void 0 : info.cluster;
            // workload.instances
            const instances = [];
            for (const node of cluster === null || cluster === void 0 ? void 0 : cluster.Shards[0].Nodes) {
                const instance = {
                    // kind: "workloadInstance",
                    name: node.Name,
                    id: node.Name,
                    status: (node.Status === 'available') ? 'running' : node.Status,
                    started: node.CreateTime,
                    ip: node.Endpoint.Address,
                    expose: [node.Endpoint.Port]
                };
                instances.push(instance);
            }
            // workload
            const workload = {
                kind: 'workload',
                name: options.identifier,
                displayName: options.identifier,
                replicas: cluster === null || cluster === void 0 ? void 0 : cluster.NumberOfShards,
                ready: cluster === null || cluster === void 0 ? void 0 : cluster.NumberOfShards,
                instances
            };
            deployedObjects.push(workload);
            // ClusterEndpoint
            const ingress = {
                kind: 'ingress',
                name: options.identifier,
                type: 'tcp',
                entrypoints: [(_a = cluster === null || cluster === void 0 ? void 0 : cluster.ClusterEndpoint) === null || _a === void 0 ? void 0 : _a.Address],
                servicePort: (_b = cluster === null || cluster === void 0 ? void 0 : cluster.ClusterEndpoint) === null || _b === void 0 ? void 0 : _b.Port,
                status: 'bound',
                description: cluster === null || cluster === void 0 ? void 0 : cluster.ClusterEndpoint
            };
            deployedObjects.push(ingress);
            return deployedObjects;
        });
    }
    /**
     * AppController.getStat
     * @returns
     */
    getStat() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const option = (yield this.store.loadObject('option'));
            const info = yield this.store.loadObject('info');
            const statObject = {
                region: option === null || option === void 0 ? void 0 : option.region,
                metric: 'cloudwatch',
                namespace: 'AWS/MemoryDB',
                dimensionName: 'ClusterName',
                dimensionValue: (_a = info === null || info === void 0 ? void 0 : info.cluster) === null || _a === void 0 ? void 0 : _a.Name,
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
                objects: [statObject],
                since: new Date(info === null || info === void 0 ? void 0 : info.launch_time)
            };
        });
    }
    /**
     * AppController.getMetricItems
     * https://docs.aws.amazon.com/ko_kr/memorydb/latest/devguide/metrics.memorydb.html
     * @returns
     */
    getMetricItems() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    name: 'CPUUtilization',
                    title: 'CPUUtilization',
                    unit: '%'
                },
                {
                    name: 'FreeableMemory',
                    title: 'FreeableMemory',
                    unit: 'Byte'
                },
                {
                    name: 'NetworkBytesIn',
                    title: 'NetworkBytesIn',
                    unit: 'Byte',
                    // options: {
                    //   mode: 'sum'
                    // }
                },
                {
                    name: 'NetworkBytesOut',
                    title: 'NetworkBytesOut',
                    unit: 'Byte',
                    // options: {
                    //   mode: 'sum'
                    // }
                },
                {
                    name: 'CurrConnections',
                    title: 'CurrConnections',
                    unit: '',
                },
                {
                    name: 'CurrItems',
                    title: 'CurrItems',
                    unit: '',
                },
                {
                    name: 'DatabaseMemoryUsagePercentage',
                    title: 'DatabaseMemoryUsagePercentage',
                    unit: '%',
                },
                {
                    name: 'DatabaseCapacityUsagePercentage',
                    title: 'DatabaseCapacityUsagePercentage',
                    unit: '%',
                }
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
            const metricObject = yield this.getStatObject();
            if (metricObject === undefined)
                return;
            let metricData = null;
            switch (name) {
                case 'CPUUtilization':
                case 'FreeableMemory':
                case 'DatabaseMemoryUsagePercentage':
                case 'DatabaseCapacityUsagePercentage':
                    metricData = yield this.cloudwatchApi.getMetricData(name, client_cloudwatch_1.Statistic.Average, metricObject, options);
                    break;
                case 'NetworkBytesIn': // memoryDB
                case 'NetworkBytesOut': // memoryDB
                    metricData = yield this.cloudwatchApi.getMetricData(name, client_cloudwatch_1.Statistic.Sum, metricObject, options);
                    break;
                case 'CurrConnections': // memoryDB
                case 'CurrItems': // memoryDB
                    metricData = yield this.cloudwatchApi.getMetricData(name, client_cloudwatch_1.Statistic.Maximum, metricObject, options);
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
exports.default = AwsMemoryDBApp;
//# sourceMappingURL=AwsMemoryDBApp.js.map