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
const AwsRDSApi_1 = require("./AwsRDSApi");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const logger = runtime_1.Logger.getLogger('app:AwsRDSApp');
class AwsRDSApp extends AwsAppController_1.AwsAppController {
    constructor() {
        super(...arguments);
        this.rdsApi = new AwsRDSApi_1.AwsRDSApi();
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
            var _a, _b, _c, _d, _e;
            // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
            let region = this.request.options.region || ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.REGION);
            // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.    
            let vpcId = this.request.options.vpcId || ((_d = (_c = this.plugin) === null || _c === void 0 ? void 0 : _c.options) === null || _d === void 0 ? void 0 : _d.VPC_ID);
            // Underscores ('_') are not allowed in Terraform
            let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
            let engine = this.request.options.engine;
            let engineVersion = engine === 'mysql' ? this.request.options.mysqlVersion : this.request.options.mariadbVersion;
            let dbSubnetGroupName = this.request.options.dbSubnetGroupName;
            let instanceClass = this.request.options.instanceClass;
            let username = this.request.options.username;
            let password = this.request.options.password;
            // if (password == undefined || password == null) {
            //   password = uniqid();
            // }
            const env = this.resolveEnv((_e = this.request.options) === null || _e === void 0 ? void 0 : _e.env);
            const prevOptions = yield this.store.loadObject('option');
            // This setting is fixed and cannot be updated.
            if (prevOptions) {
                region = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.region;
                vpcId = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.vpcId;
                identifier = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.identifier;
                engine = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.engine;
                engineVersion = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.engineVersion;
                dbSubnetGroupName = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.dbSubnetGroupName;
                instanceClass = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.instanceClass;
                username = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.username;
                password = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.password;
            }
            if (!region)
                throw new Error(`options 'Region' is required`);
            if (!vpcId)
                throw new Error(`options 'VPC ID' is required`);
            if (!engine)
                throw new Error(`options 'Engine(Database)' is required`);
            if (!dbSubnetGroupName)
                throw new Error(`options 'DB Subnet Group Name' is required`);
            if (!instanceClass)
                throw new Error(`options 'Instance Class' is required`);
            const options = {
                region,
                vpcId,
                identifier,
                engine,
                engineVersion,
                dbSubnetGroupName,
                instanceClass,
                username,
                password,
                // state: STATE.stopped,
                env
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
            return;
        });
    }
    /**
     * AwsAppController.saveDescribe
     * Called by start
     * Describe instances via the AwsRDSApi(aws sdk)
     * @param options
     */
    saveDescribe(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const db_instance = yield this.rdsApi.describe(options.region, options.identifier);
            yield this.store.save('info', {
                db_instance,
                deployed: (db_instance.DBInstanceStatus === 'available') ? true : false,
            });
        });
    }
    /**
     * AppController.start
     * terraform apply 실행
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[START]`, this.request);
            const options = yield this.readOptions();
            yield this.runApply(options);
            // start
            const status = yield this.rdsApi.start(options.region, options.identifier);
            logger.info(`[START]Done`, this.request);
            yield this.saveDescribe(options);
        });
    }
    /**
     * AppController.stop
     * terraform apply 실행
     */
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[STOP]`, this.request);
            const options = yield this.readOptions();
            yield this.rdsApi.stop(options.region, options.identifier);
            logger.info(`[STOP]Done`, this.request);
            yield this.saveDescribe(options);
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
            const db_instance = info === null || info === void 0 ? void 0 : info.db_instance;
            // workload
            const workload = {
                kind: 'workload',
                name: options.identifier,
                displayName: options.identifier,
                replicas: info.deployed ? 1 : 0, // stop은 ....... 
                ready: info.deployed ? 1 : 0,
                instances: [
                    {
                        id: db_instance.DBInstanceIdentifier,
                        status: db_instance.DBInstanceStatus,
                        started: new Date(db_instance.InstanceCreateTime),
                        // ip: 
                    }
                ]
            };
            deployedObjects.push(workload);
            const domain = {
                kind: 'domain',
                name: options.identifier,
                entrypoints: [(_a = db_instance.Endpoint) === null || _a === void 0 ? void 0 : _a.Address],
                // service: db_instance.DbInstancePort,
                servicePort: (_b = db_instance.Endpoint) === null || _b === void 0 ? void 0 : _b.Port,
                status: 'bound',
                description: db_instance.Endpoint
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
            var _a;
            const info = yield this.store.loadObject('info');
            const option = yield this.store.loadObject('option');
            const statObject = {
                region: option === null || option === void 0 ? void 0 : option.region,
                metric: 'cloudwatch',
                namespace: 'AWS/RDS',
                dimensionName: 'DBInstanceIdentifier',
                dimensionValue: (_a = info === null || info === void 0 ? void 0 : info.db_instance) === null || _a === void 0 ? void 0 : _a.DBInstanceIdentifier,
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
                    name: 'NetworkReceiveThroughput',
                    title: 'NetworkReceiveThroughput',
                    unit: 'Byte',
                    // options: {
                    //   mode: 'sum'
                    // }
                },
                {
                    name: 'NetworkTransmitThroughput',
                    title: 'NetworkTransmitThroughput',
                    unit: 'Byte',
                    // options: {
                    //   mode: 'sum'
                    // }
                },
                {
                    name: 'FreeStorageSpace',
                    title: 'FreeStorageSpace',
                    unit: 'Byte'
                },
                {
                    name: 'DatabaseConnections',
                    title: 'DatabaseConnections',
                    unit: '',
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
                case 'FreeStorageSpace':
                    metricData = yield this.cloudwatchApi.getMetricData(name, client_cloudwatch_1.Statistic.Average, metricObject, options);
                    break;
                case 'NetworkReceiveThroughput': // rds
                case 'NetworkTransmitThroughput': // rds
                    metricData = yield this.cloudwatchApi.getMetricData(name, client_cloudwatch_1.Statistic.Sum, metricObject, options);
                    break;
                case 'DatabaseConnections': // rds
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
exports.default = AwsRDSApp;
//# sourceMappingURL=AwsRDSApp.js.map