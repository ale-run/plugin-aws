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
const AwsECSApi_1 = require("./AwsECSApi");
const AwsELBApi_1 = require("./AwsELBApi");
const client_elastic_load_balancing_v2_1 = require("@aws-sdk/client-elastic-load-balancing-v2");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const logger = runtime_1.Logger.getLogger('app:AwsECSApp');
/**
 * Requires a pre-existing ECS cluster (sg : All TCP & VPC CIDR )
 * Requires a pre-existing EFS to use the volume (sg : NFS 2049 & VPC CIDR)
 */
class AwsECSApp extends AwsAppController_1.AwsAppController {
    constructor() {
        super(...arguments);
        this.ecsApi = new AwsECSApi_1.AwsECSApi();
        this.elbApi = new AwsELBApi_1.AwsELBApi();
        // Requires ECS cluster name
        this.CLUSTER_NAME = 'ecs-cluster-ec2';
        // Requires EFS name
        this.EFS_NAME = 'ecs-efs-volume';
        this.TASK_ROLE_NAME = 'ecsTaskExecutionRole';
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
     * @returns ECS
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
            let clusterName = this.CLUSTER_NAME;
            let efsName = this.EFS_NAME;
            let taskRoleName = this.TASK_ROLE_NAME;
            const containerName = this.request.options.containerName;
            const containerImage = this.request.options.containerImage;
            const containerPort = this.request.options.containerPort;
            // service & lb name (32 character) 
            const serviceName = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.deploymentname;
            const volumes = this.request.options.volumes;
            const containerVolumes = [];
            if (volumes) {
                for (const v of volumes) {
                    const containerVolume = {
                        name: v.name,
                        path: v.value,
                        efs_path: '/' + serviceName + '/' + v.name,
                        gid: 0,
                        uid: 0
                    };
                    containerVolumes.push(containerVolume);
                }
            }
            const launchType = this.request.options.launchType;
            const desiredCount = this.request.options.desiredCount;
            let env = (_e = this.request.options) === null || _e === void 0 ? void 0 : _e.env;
            let environments = [];
            if (env) {
                environments = env;
            }
            env = yield this.resolveEnv(env);
            const prevOptions = yield this.store.loadObject('option');
            // This setting is fixed and cannot be updated.
            if (prevOptions) {
                region = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.region;
                vpcId = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.vpcId;
                identifier = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.identifier;
                clusterName = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.clusterName;
                efsName = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.efsName;
                taskRoleName = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.taskRoleName;
            }
            logger.debug('containerVolumes=', JSON.stringify(containerVolumes));
            logger.debug('environments=', JSON.stringify(environments));
            logger.debug('env=', JSON.stringify(env));
            if (!region)
                throw new Error(`options 'Region' is required`);
            if (!vpcId)
                throw new Error(`options 'VPC ID' is required`);
            if (!containerName)
                throw new Error(`options 'containerName' is required`);
            if (!containerImage)
                throw new Error(`options 'containerImage' is required`);
            if (!containerPort)
                throw new Error(`options 'containerPort' is required`);
            const options = {
                region,
                vpcId,
                identifier,
                clusterName,
                efsName,
                taskRoleName,
                containerName,
                containerImage,
                containerPort,
                containerVolumes,
                serviceName,
                launchType,
                desiredCount,
                environments,
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
     * Called by AwsAppController.start
     * Describe instances via the AwsECSApi & AwsELBApi(aws sdk)
     * @param region
     * @param identifier
     */
    saveDescribe(options) {
        return __awaiter(this, void 0, void 0, function* () {
            // service
            const service = yield this.ecsApi.describeService(options.region, options.clusterName, options.serviceName);
            // taskDefinition
            const taskDefinition = yield this.ecsApi.describeTaskDefinition(options.region, service === null || service === void 0 ? void 0 : service.taskDefinition);
            // loadBalancer
            let loadBalancer;
            if (service === null || service === void 0 ? void 0 : service.loadBalancers) {
                const targetGroup = yield this.elbApi.describeTargetGroup(options.region, service === null || service === void 0 ? void 0 : service.loadBalancers[0].targetGroupArn);
                loadBalancer = yield this.elbApi.describeLoadBalancer(options.region, targetGroup === null || targetGroup === void 0 ? void 0 : targetGroup.LoadBalancerArns[0]);
            }
            // task
            let task;
            if (options.desiredCount > 0) {
                task = yield this.ecsApi.describeTaskNWaiting(options.region, options.clusterName, options.serviceName);
            }
            const ecsInfo = {
                desiredCount: service === null || service === void 0 ? void 0 : service.desiredCount,
                runningCount: service === null || service === void 0 ? void 0 : service.runningCount,
                taskDefinition,
                loadBalancer,
                task,
            };
            yield this.store.save('info', ecsInfo);
        });
    }
    /**
     * AppController.stop
     * terraform apply
     */
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[STOP]`, this.request.name);
            yield this.store.save('status', runtime_1.SERVICE_STATUS.stopping);
            const options = yield this.store.loadObject('option');
            options.desiredCount = 0;
            yield this.runApply(options);
            logger.info(`[STOP]Done`, this.request.name);
            yield this.store.save('status', runtime_1.SERVICE_STATUS.stopped);
            yield this.saveDescribe(options);
        });
    }
    /**
     * AppController.list
     * @param type
     * @returns
     */
    list(kind) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const deployedObjects = [];
            const info = yield this.store.loadObject('info');
            if (!info)
                return deployedObjects;
            const options = yield this.store.loadObject('option');
            const taskDefinition = info.taskDefinition;
            const loadBalancer = info.loadBalancer;
            let task;
            if (info.desiredCount > 0) {
                task = yield this.ecsApi.describeTask(options.region, options.clusterName, options.serviceName);
                info.task = task;
            }
            // workload
            const workload = {
                kind: 'workload',
                name: options.serviceName,
                displayName: options.serviceName,
                replicas: info === null || info === void 0 ? void 0 : info.desiredCount,
                ready: info === null || info === void 0 ? void 0 : info.runningCount,
                instances: [
                    {
                        kind: 'task',
                        name: task === null || task === void 0 ? void 0 : task.taskArn.split('/').reverse()[0],
                        id: task === null || task === void 0 ? void 0 : task.taskArn,
                        status: task === null || task === void 0 ? void 0 : task.lastStatus,
                        // restarts: 0,
                        started: new Date(task === null || task === void 0 ? void 0 : task.startedAt),
                        ip: (_c = (_b = (_a = task === null || task === void 0 ? void 0 : task.attachments[0]) === null || _a === void 0 ? void 0 : _a.details) === null || _b === void 0 ? void 0 : _b.find(({ name }) => name === 'privateIPv4Address')) === null || _c === void 0 ? void 0 : _c.value,
                        limits: {
                            cpu: task === null || task === void 0 ? void 0 : task.cpu,
                            memory: task === null || task === void 0 ? void 0 : task.memory
                        },
                        // usage: {
                        //   cpu: 0.3,
                        //   memory: 256 * 1024 * 1024
                        // },
                        expose: [options.containerPort],
                        description: task
                    },
                ]
            };
            deployedObjects.push(workload);
            // ingress
            const ingress = {
                kind: 'ingress',
                name: loadBalancer === null || loadBalancer === void 0 ? void 0 : loadBalancer.LoadBalancerName,
                type: 'lb',
                entrypoints: [loadBalancer === null || loadBalancer === void 0 ? void 0 : loadBalancer.DNSName],
                // status?: "bound" | "unbound",
                status: (((_d = loadBalancer === null || loadBalancer === void 0 ? void 0 : loadBalancer.State) === null || _d === void 0 ? void 0 : _d.Code) === client_elastic_load_balancing_v2_1.LoadBalancerStateEnum.ACTIVE) ? 'bound' : 'unbound',
                // service?: string;
                // servicePort?: number;
                description: loadBalancer
            };
            deployedObjects.push(ingress);
            // volume
            for (const idx in taskDefinition === null || taskDefinition === void 0 ? void 0 : taskDefinition.containerDefinitions[0].mountPoints) {
                const mountPoint = taskDefinition === null || taskDefinition === void 0 ? void 0 : taskDefinition.containerDefinitions[0].mountPoints[idx];
                const volume = taskDefinition === null || taskDefinition === void 0 ? void 0 : taskDefinition.volumes[idx];
                const v = {
                    kind: 'volume',
                    name: mountPoint === null || mountPoint === void 0 ? void 0 : mountPoint.sourceVolume,
                    // name: `${mountPoint?.sourceVolume} (${mountPoint?.containerPath})`, 
                    size: 0, // 용량, GiB 단위
                    mode: (mountPoint === null || mountPoint === void 0 ? void 0 : mountPoint.readOnly) ? 'ro' : 'rwx', // 모드, rwo, rwx, ro
                    status: 'bound',
                    // fileSystemId: volume?.efsVolumeConfiguration.fileSystemId,
                    // accessPointId: volume?.efsVolumeConfiguration.authorizationConfig.accessPointId,
                    description: volume
                };
                deployedObjects.push(v);
            }
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
            const status = yield this.store.load('status');
            const regex = new RegExp('loadbalancer/(app/.*)');
            const match = regex.exec((_a = info === null || info === void 0 ? void 0 : info.loadBalancer) === null || _a === void 0 ? void 0 : _a.LoadBalancerArn);
            const loadBalancer = match[1];
            const statObject = {
                region: option === null || option === void 0 ? void 0 : option.region,
                metric: 'cloudwatch',
                namespace: 'AWS/ECS',
                dimensionName: 'ServiceName',
                dimensionValue: option === null || option === void 0 ? void 0 : option.serviceName,
                clusterName: option === null || option === void 0 ? void 0 : option.clusterName,
                loadBalancer,
                identifier: option === null || option === void 0 ? void 0 : option.identifier
            };
            const elbObject = {
                region: option === null || option === void 0 ? void 0 : option.region,
                metric: 'cloudwatch/ELB',
                namespace: 'AWS/ApplicationELB',
                dimensionName: 'LoadBalancer',
                dimensionValue: loadBalancer,
                identifier: option === null || option === void 0 ? void 0 : option.identifier
            };
            return {
                status: runtime_1.SERVICE_STATUS[status],
                objects: [statObject, elbObject],
                // cpu: +info?.cpu || 0,
                // memory: +info?.memory || 0,
                // disk: +info?.disk || 0,
                // replicas: status === 'running' ? 1 : 0,
                // ready: status === 'running' ? 1 : 0,
                // available: status === 'running' ? 1 : 0,
                // unavailable: status === 'running' ? 0 : 1,
                // entrypoints: info?.endpoint
                //   ?
                //   [
                //     {
                //       link: info.endpoint,
                //       type: 'tcp'
                //     }
                //   ]
                //   : null,
                // exposes: [],
                // since: new Date(info?.launch_time)
            };
        });
    }
    // Metric
    // https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/developerguide/available-metrics.html
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
                    name: 'MemoryUtilization',
                    title: 'MemoryUtilization',
                    unit: '%',
                },
                {
                    name: 'ProcessedBytes',
                    title: 'ProcessedBytes',
                    unit: 'Byte',
                },
                {
                    name: 'HTTPCode_ELB_4XX_Count',
                    title: 'HTTPCode_ELB_4XX_Count',
                    unit: 'Count',
                },
                {
                    name: 'HTTPCode_Target_2XX_Count',
                    title: 'HTTPCode_Target_2XX_Count',
                    unit: 'Count',
                },
                {
                    name: 'HTTPCode_Target_3XX_Count',
                    title: 'HTTPCode_Target_3XX_Count',
                    unit: 'Count',
                },
                {
                    name: 'HTTPCode_Target_4XX_Count',
                    title: 'HTTPCode_Target_4XX_Count',
                    unit: 'Count',
                },
                {
                    name: 'HTTPCode_Target_5XX_Count',
                    title: 'HTTPCode_Target_5XX_Count',
                    unit: 'Count',
                },
            ];
        });
    }
    getMetric(name, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let metricData = null;
            switch (name) {
                case 'CPUUtilization':
                case 'MemoryUtilization':
                    const metricObject = yield this.getStatObject();
                    if (metricObject === undefined)
                        return;
                    metricData = yield this.cloudwatchApi.getECSMetricData(name, client_cloudwatch_1.Statistic.Average, metricObject, options);
                    break;
                case 'ProcessedBytes':
                case 'HTTPCode_ELB_2XX_Count':
                case 'HTTPCode_ELB_3XX_Count':
                case 'HTTPCode_ELB_4XX_Count':
                case 'HTTPCode_ELB_5XX_Count':
                case 'HTTPCode_Target_2XX_Count':
                case 'HTTPCode_Target_3XX_Count':
                case 'HTTPCode_Target_4XX_Count':
                case 'HTTPCode_Target_5XX_Count':
                    const elbObject = yield this.getStatObject('cloudwatch/ELB');
                    if (elbObject === undefined)
                        return;
                    metricData = yield this.cloudwatchApi.getMetricData(name, client_cloudwatch_1.Statistic.Sum, elbObject, options);
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
exports.default = AwsECSApp;
//# sourceMappingURL=AwsECSApp.js.map