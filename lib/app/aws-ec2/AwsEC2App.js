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
const logger = runtime_1.Logger.getLogger('app:AwsEC2App');
class AwsEC2App extends AwsAppController_1.AwsAppController {
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
            var _a, _b, _c, _d, _e;
            // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
            let region = this.request.options.region.trim() || ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.REGION);
            // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.
            let vpcId = this.request.options.vpcId.trim() || ((_d = (_c = this.plugin) === null || _c === void 0 ? void 0 : _c.options) === null || _d === void 0 ? void 0 : _d.VPC_ID);
            // Underscores ('_') are not allowed in Terraform
            let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
            const instanceType = this.request.options.instanceType.trim();
            let subnetTier = this.request.options.subnetTier.trim();
            let subnetZone = this.request.options.subnetZone.trim();
            const volumeSize = this.request.options.volumeSize;
            const env = this.resolveEnv((_e = this.request.options) === null || _e === void 0 ? void 0 : _e.env);
            const prevOptions = yield this.store.loadObject('option');
            // This setting is fixed and cannot be updated.
            if (prevOptions) {
                region = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.region;
                vpcId = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.vpcId;
                identifier = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.identifier;
                subnetTier = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.subnetTier;
                subnetZone = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.subnetZone;
            }
            if (!region)
                throw new Error(`options 'Region' is required`);
            if (!vpcId)
                throw new Error(`options 'VPC ID' is required`);
            if (!instanceType)
                throw new Error(`options 'Instance Type' is required`);
            if (!subnetTier)
                throw new Error(`options 'Tier(public/private)' is required`);
            if (!subnetZone)
                throw new Error(`options 'Zone(a/b/c)' is required`);
            const options = {
                region,
                vpcId,
                identifier,
                instanceType,
                subnetTier,
                subnetZone,
                volumeSize,
                instanceState: runtime_1.SERVICE_STATUS.running,
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
            // save pem
            yield this.savePem(shell);
            // output 
            const instance_id = yield this.getOutput(stream, shell, 'instance_id');
            const instance_state = yield this.getOutput(stream, shell, 'instance_state');
            const instance_type = yield this.getOutput(stream, shell, 'instance_type');
            const private_dns = yield this.getOutput(stream, shell, 'private_dns');
            const private_ip = yield this.getOutput(stream, shell, 'private_ip');
            const launch_time = yield this.getOutput(stream, shell, 'launch_time');
            const public_dns = yield this.getOutput(stream, shell, 'public_dns');
            const public_ip = yield this.getOutput(stream, shell, 'public_ip');
            const rootBlockDevice = yield this.getOutput(stream, shell, 'root_block_device');
            // save info
            yield this.store.save('info', {
                instance_id,
                instance_state,
                deployed: (instance_state === 'running') ? true : false,
                instance_type,
                private_dns,
                private_ip,
                launch_time,
                public_dns,
                public_ip,
                rootBlockDevice
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
     * AppController.stop
     * terraform apply
     */
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[STOP]`, this.request);
            const options = yield this.readOptions();
            options.instanceState = runtime_1.SERVICE_STATUS.stopped;
            yield this.runApply(options);
            logger.info(`[STOP]Done`, this.request);
        });
    }
    /**
     * SSH connect config
     * @returns
     */
    getConnectConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const info = yield this.store.loadObject('info');
            const pem = yield this.store.load('pem');
            console.log(info.public_dns);
            const config = {
                host: info === null || info === void 0 ? void 0 : info.public_dns,
                port: 22,
                username: 'ubuntu',
                // privateKey: fs.readFileSync('/path/to/your/private/key')
                privateKey: pem
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
            if (info === undefined || info === null)
                return;
            const options = yield this.store.loadObject('option');
            logger.info(`[LIST]`, this.request);
            logger.info(`[LIST][info]`, info);
            // workload
            const workload = {
                kind: 'workload',
                name: options.identifier,
                displayName: options.identifier,
                replicas: (info === null || info === void 0 ? void 0 : info.deployed) ? 1 : 0,
                ready: (info === null || info === void 0 ? void 0 : info.deployed) ? 1 : 0,
                instances: [
                    {
                        id: info === null || info === void 0 ? void 0 : info.instance_id,
                        status: info === null || info === void 0 ? void 0 : info.instance_state,
                        started: new Date(info === null || info === void 0 ? void 0 : info.start),
                        ip: info === null || info === void 0 ? void 0 : info.private_dns
                    }
                ]
            };
            deployedObjects.push(workload);
            // privateIP 1
            const expose = {
                kind: 'expose',
                name: 'private',
                hostname: info === null || info === void 0 ? void 0 : info.private_dns,
                port: 22,
                protocol: 'tcp',
                description: 'description'
            };
            deployedObjects.push(expose);
            // volume
            if (info === null || info === void 0 ? void 0 : info.rootBlockDevice) {
                const volumes = JSON.parse(info === null || info === void 0 ? void 0 : info.rootBlockDevice);
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
                for (const volume of volumes) {
                    const v = {
                        kind: 'volume',
                        name: volume.volume_id,
                        // displayName: volume.device_name,
                        size: volume.volume_size,
                        mode: 'rwx',
                        status: 'bound',
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
            if (info === undefined || info === null)
                return;
            const option = yield this.store.loadObject('option');
            const statObject = {
                region: option === null || option === void 0 ? void 0 : option.region,
                metric: 'cloudwatch',
                namespace: 'AWS/EC2',
                dimensionName: 'InstanceId',
                dimensionValue: info === null || info === void 0 ? void 0 : info.instance_id,
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
}
exports.default = AwsEC2App;
//# sourceMappingURL=AwsEC2App.js.map