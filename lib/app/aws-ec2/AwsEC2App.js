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
const stream_1 = require("stream");
const ssh2_1 = require("ssh2");
const AwsEC2Api_1 = require("./AwsEC2Api");
const logger = runtime_1.Logger.getLogger('app:AwsEC2App');
class AwsEC2App extends AwsAppController_1.AwsAppController {
    constructor() {
        super(...arguments);
        this.ec2Api = new AwsEC2Api_1.AwsEC2Api();
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
     * @returns EC2
     */
    readOptions() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
            let region = ((_a = this.request.options.region) === null || _a === void 0 ? void 0 : _a.trim()) || ((_c = (_b = this.plugin) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? void 0 : _c.REGION);
            // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.
            let vpcId = ((_d = this.request.options.vpcId) === null || _d === void 0 ? void 0 : _d.trim()) || ((_f = (_e = this.plugin) === null || _e === void 0 ? void 0 : _e.options) === null || _f === void 0 ? void 0 : _f.VPC_ID);
            let subnetId = ((_g = this.request.options.subnetId) === null || _g === void 0 ? void 0 : _g.trim()) || ((_j = (_h = this.plugin) === null || _h === void 0 ? void 0 : _h.options) === null || _j === void 0 ? void 0 : _j.SUBNET_ID);
            let amiId = ((_k = this.request.options.amiId) === null || _k === void 0 ? void 0 : _k.trim()) || ((_m = (_l = this.plugin) === null || _l === void 0 ? void 0 : _l.options) === null || _m === void 0 ? void 0 : _m.AMI_ID);
            // Underscores ('_') are not allowed in Terraform
            let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
            // let subnetTier = this.request.options.subnetTier.trim();
            // let subnetZone = this.request.options.subnetZone.trim();
            let associatePublicIpAddress = this.request.options.associatePublicIpAddress;
            const instanceType = this.request.options.instanceType.trim();
            const volumeSize = this.request.options.volumeSize;
            let username = this.request.options.username;
            const prevOptions = yield this.store.loadObject('option');
            // This setting is fixed and cannot be updated.
            if (prevOptions) {
                region = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.region;
                vpcId = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.vpcId;
                identifier = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.identifier;
                subnetId = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.subnetId;
                amiId = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.amiId;
                associatePublicIpAddress = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.associatePublicIpAddress;
                // volumeSize = prevOptions?.volumeSize;
                // subnetTier = prevOptions?.subnetTier;
                // subnetZone = prevOptions?.subnetZone;
            }
            if (!region)
                throw new Error(`options 'Region' is required`);
            if (!vpcId)
                throw new Error(`options 'VPC ID' is required`);
            if (!subnetId)
                throw new Error(`options 'Subnet ID' is required`);
            if (!amiId)
                throw new Error(`options 'AMI ID' is required`);
            // imageName
            let imageName = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.imageName;
            if (!imageName) {
                const image = yield this.ec2Api.describeImage(region, amiId);
                if (!image)
                    throw new Error(`options 'AMI ID' does not exist`);
                imageName = image.Name;
            }
            if (!username) {
                username = (prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.username) || this.getDefaultUsername(imageName);
            }
            const options = {
                region,
                vpcId,
                identifier,
                subnetId,
                amiId,
                imageName,
                associatePublicIpAddress,
                instanceType,
                volumeSize,
                username,
                // instanceState: SERVICE_STATUS.running,
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
            // save pem
            yield this.savePem(shell);
            // output 
            const instanceId = yield this.getOutput(stream, shell, 'instance_id');
            const instanceType = yield this.getOutput(stream, shell, 'instance_type');
            const privateDns = yield this.getOutput(stream, shell, 'private_dns');
            const privateIp = yield this.getOutput(stream, shell, 'private_ip');
            const launchTime = yield this.getOutput(stream, shell, 'launch_time');
            const publicDns = yield this.getOutput(stream, shell, 'public_dns');
            const publicIp = yield this.getOutput(stream, shell, 'public_ip');
            // const rootBlockDevice = await this.getOutput(stream, shell, 'root_block_device');
            // save info
            yield this.store.save('info', {
                instanceId,
                instanceType,
                privateDns,
                privateIp,
                launchTime,
                publicDns,
                publicIp,
            });
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
            const instance = yield this.ec2Api.describeInstance(options.region, options.identifier);
            const volumes = yield this.ec2Api.describeVolumes(options.region, instance === null || instance === void 0 ? void 0 : instance.InstanceId);
            yield this.store.save('info', {
                instanceId: instance === null || instance === void 0 ? void 0 : instance.InstanceId,
                instanceType: instance === null || instance === void 0 ? void 0 : instance.InstanceType,
                privateDns: instance === null || instance === void 0 ? void 0 : instance.PrivateDnsName,
                privateIp: instance === null || instance === void 0 ? void 0 : instance.PrivateIpAddress,
                launchTime: instance.LaunchTime,
                publicDns: instance === null || instance === void 0 ? void 0 : instance.PublicDnsName,
                publicIp: instance === null || instance === void 0 ? void 0 : instance.PublicIpAddress,
                volumes
            });
        });
    }
    // save pem 
    // TODO only admin
    savePem(shell) {
        return __awaiter(this, void 0, void 0, function* () {
            const pem = yield shell.readFile('key.pem');
            if (pem) {
                yield this.store.save('pem', pem);
            }
        });
    }
    /**
     * AppController.start
     * terraform apply
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[START]`, this.request.name);
            yield this.store.save('status', runtime_1.SERVICE_STATUS.starting);
            const options = yield this.store.loadObject('option');
            yield this.runApply(options);
            // start
            const info = yield this.store.loadObject('info');
            this.ec2Api.startInstance(options.region, info.instanceId);
            logger.info(`[START]Done`, this.request.name);
            yield this.store.save('status', runtime_1.SERVICE_STATUS.running);
            yield this.saveDescribe(options);
        });
    }
    /**
     * AppController.stop
     * terraform apply
     */
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            const prevStatus = this.store.load('status');
            logger.info(`[STOP]`, this.request.name);
            yield this.store.save('status', runtime_1.SERVICE_STATUS.stopping);
            const options = yield this.store.loadObject('option');
            const info = yield this.store.loadObject('info');
            this.ec2Api.stopInstance(options.region, info.instanceId);
            logger.info(`[STOP]Done`, this.request.name);
            yield this.store.save('status', runtime_1.SERVICE_STATUS.stopped);
        });
    }
    /**
     * SSH connect config
     * @returns
     */
    getConnectConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const info = yield this.store.loadObject('info');
            const options = yield this.store.loadObject('option');
            const pem = yield this.store.load('pem');
            const config = {
                host: (info === null || info === void 0 ? void 0 : info.publicDns) || (info === null || info === void 0 ? void 0 : info.privateDns),
                port: 22,
                username: options === null || options === void 0 ? void 0 : options.username,
                // privateKey: fs.readFileSync('/path/to/your/private/key')
                privateKey: pem,
                readyTimeout: 10000
            };
            return config;
        });
    }
    /**
     * AppController.attach
     * Termianl
     * @param id
     * @param options
     * @returns
     */
    attach(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const stdin = new stream_1.PassThrough();
            const stdout = new stream_1.PassThrough();
            const stderr = new stream_1.PassThrough();
            function cleanInput(input) {
                // ANSI escape 시퀀스 remove (예: "\x1b[31m", "\x1b[0K" 등)
                let cleaned = input.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
                // backspace(\x08) remove
                cleaned = cleaned.replace(/\x08/g, '');
                // Carriage Return(\r) remove
                cleaned = cleaned.replace(/\r/g, '');
                return cleaned;
            }
            const config = yield this.getConnectConfig();
            const client = new ssh2_1.Client();
            client.connect(config);
            client.on('ready', () => {
                logger.info('[TERMINAL]Connect');
                client.shell((err, stream) => {
                    if (err)
                        throw err;
                    // filtering & setWindow
                    const filterStream = new stream_1.Transform({
                        transform(chunk, encoding, callback) {
                            const data = chunk.toString();
                            if (data.includes('{') && data.includes('}')) {
                                this.push('');
                                const windowSize = JSON.parse(data);
                                stream.setWindow(windowSize.r, windowSize.c, 1000, windowSize.c);
                            }
                            else {
                                if (+chunk === 0) {
                                    this.push(data);
                                }
                                else {
                                    this.push(cleanInput(data));
                                }
                            }
                            callback();
                        }
                    });
                    stream.on('data', (data) => {
                        logger.debug(data.toString());
                    });
                    stdin.pipe(filterStream).pipe(stream); // user input to the SSH stream
                    stream.pipe(stdout); // SSH stream output to the terminal
                    stream.on('close', () => {
                        logger.info('[TERMINAL]Close');
                        stdin.unpipe(stream);
                        client.end();
                    });
                });
            });
            client.on('error', (error) => {
                logger.error(`[TERMINAL]Error`, error);
                stderr.write(error.message);
                client.end();
            });
            client.on('timeout', () => {
                logger.error('[TERMINAL]timeout');
                stderr.write('connection timeout');
                client.end();
            });
            return {
                stdin,
                stdout,
                stderr
            };
        });
    }
    /**
     * AppController.list
     * @param type
     * @returns
     */
    list(kind) {
        return __awaiter(this, void 0, void 0, function* () {
            const deployedObjects = [];
            const info = yield this.store.loadObject('info');
            if (!info)
                return;
            const options = yield this.store.loadObject('option');
            const status = yield this.store.load('status');
            // workload
            const workload = {
                kind: 'workload',
                name: options.identifier,
                displayName: options.identifier,
                replicas: status === 'running' ? 1 : 0,
                ready: status === 'running' ? 1 : 0,
                instances: [
                    {
                        id: info === null || info === void 0 ? void 0 : info.instanceId,
                        status: info === null || info === void 0 ? void 0 : info.instanceState,
                        started: new Date(info === null || info === void 0 ? void 0 : info.launchTime),
                        ip: info === null || info === void 0 ? void 0 : info.privateDns
                    }
                ]
            };
            deployedObjects.push(workload);
            // publicIP
            if (info === null || info === void 0 ? void 0 : info.publicDns) {
                const ingress = {
                    kind: 'ingress',
                    name: 'public',
                    type: 'tcp',
                    entrypoints: [info === null || info === void 0 ? void 0 : info.publicDns],
                    servicePort: 22,
                    status: 'bound',
                    // description: 'description'
                };
                deployedObjects.push(ingress);
            }
            // privateIP
            const expose = {
                kind: 'expose',
                name: 'private',
                hostname: info === null || info === void 0 ? void 0 : info.privateDns,
                port: 22,
                protocol: 'tcp',
                // description: 'description'
            };
            deployedObjects.push(expose);
            // volume
            if (info === null || info === void 0 ? void 0 : info.volumes) {
                // delete_on_termination: true
                // device_name: /dev/sda1
                // encrypted: false
                // iops: 150
                // kms_key_id: ""
                // tags: null
                // tags_all:
                //   Created: ale
                //   Environment: dev
                //   Name: dev-aws-ec2-main-aws-ec2-282
                // throughput: 0
                // volume_id: vol-0245154e6032c1455
                // volume_size: 50
                // volume_type: gp2
                for (const volume of info === null || info === void 0 ? void 0 : info.volumes) {
                    const v = {
                        kind: 'volume',
                        name: volume.VolumeId,
                        size: volume.Size,
                        mode: 'rwx',
                        status: (volume.State === 'in-use') ? 'bound' : 'unbound',
                        description: volume
                    };
                    deployedObjects.push(v);
                }
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
            const info = yield this.store.loadObject('info');
            const option = yield this.store.loadObject('option');
            const status = yield this.store.load('status');
            const statObject = {
                region: option === null || option === void 0 ? void 0 : option.region,
                metric: 'cloudwatch',
                namespace: 'AWS/EC2',
                dimensionName: 'InstanceId',
                dimensionValue: info === null || info === void 0 ? void 0 : info.instanceId,
                identifier: option === null || option === void 0 ? void 0 : option.identifier
            };
            return {
                status: runtime_1.SERVICE_STATUS[status],
                objects: [statObject],
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
                    name: 'NetworkIn',
                    title: 'NetworkIn',
                    unit: 'Byte',
                    // options: {
                    //   mode: 'sum'
                    // }
                },
                {
                    name: 'NetworkOut',
                    title: 'NetworkOut',
                    unit: 'Byte',
                    // options: {
                    //   mode: 'sum'
                    // }
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
                    metricData = yield this.cloudwatchApi.getCPUUtilization(metricObject, options);
                    break;
                case 'NetworkIn':
                    metricData = yield this.cloudwatchApi.getNetworkIn(metricObject, options);
                    break;
                case 'NetworkOut':
                    metricData = yield this.cloudwatchApi.getNetworkOut(metricObject, options);
                    break;
                default:
                    logger.warn(`[METRIC][${this.deployment.name}] undefined metric item '${name}'`);
                    return;
            }
            logger.info(`[METRIC][${this.deployment.name}]${name}`, metricData);
            return metricData;
        });
    }
    /*
     * In most cases, the default username
     * Amazon Linux	ec2-user
     * Ubuntu	      ubuntu
     * RHEL	        ec2-user or root
     * CentOS	      centos
     * Debian	      admin or debian
     * SUSE Linux	  ec2-user or root
     * Fedora	      fedora
     * Windows	    Administrator (RDP 사용)
     */
    getDefaultUsername(imageName) {
        const regex = new RegExp('(ubuntu|rhel|centos|debian|suse|fedora|windows|macos)');
        const match = regex.exec(imageName.toLowerCase());
        const os = match === null || match === void 0 ? void 0 : match[1];
        let username = 'ec2-user';
        switch (os) {
            case 'ubuntu':
                username = 'ubuntu';
                break;
            case 'rhel':
                username = 'ec2-user';
                break;
            case 'centos':
                username = 'centos';
                break;
            case 'debian':
                username = 'admin';
                break;
            case 'suse':
                username = 'ec2-user';
                break;
            case 'fedora':
                username = 'fedora';
                break;
            case 'windows':
                username = 'Administrator';
                break;
            case 'macos':
                username = 'ec2-user';
                break;
            default:
                username = 'ec2-user';
        }
        return username;
    }
}
exports.default = AwsEC2App;
//# sourceMappingURL=AwsEC2App.js.map