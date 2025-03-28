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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsAppController = void 0;
const runtime_1 = require("@ale-run/runtime");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const es6_template_string_1 = __importDefault(require("es6-template-string"));
const AwsCloudwatchApi_1 = require("./AwsCloudwatchApi");
const logger = runtime_1.Logger.getLogger('app:AwsAppController');
const PROVIDER = 'aws';
const TF_FILES = ['./terraform/main.tf', './terraform/outputs.tf', './terraform/variables.tf', './terraform/versions.tf'];
const TFVARS_FILE = './terraform/terraform.tfvars';
// const TFPLAN_FILE = 'terraform.tfplan';
const TFSTATE_FILE = '.state/terraform.tfstate';
// const OUTPUT_FILE = 'output.json';
const SOURCE_DIR = 'source';
class AwsAppController extends runtime_1.AppController {
    constructor() {
        super(...arguments);
        this.cloudwatchApi = new AwsCloudwatchApi_1.AwsCloudwatchApi();
    }
    /**
     * Called by start
     * instance information via API (aws sdk)
     * @param options
     */
    saveDescribe(options) {
        return;
    }
    /**
     * AppController.deploy
     * terraform plan
     */
    deploy() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[DEPLOY]`, this.request);
            const options = yield this.readOptions();
            // options.instanceState = SERVICE_STATUS.running
            yield this.runPlan(options);
            logger.info(`[DEPLOY]done`, this.request);
        });
    }
    /**
     * AppController.start
     * terraform apply
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[START]`, this.request);
            const options = yield this.readOptions();
            // options.instanceState = SERVICE_STATUS.running
            yield this.runApply(options);
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
            // options.instanceState = SERVICE_STATUS.stopping
            yield this.runApply(options);
            logger.info(`[STOP]Done`, this.request);
            yield this.saveDescribe(options);
        });
    }
    /**
     * AppController.destory
     * terraform destroy
     */
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[DESTROY]`, this.request);
            const options = yield this.readOptions();
            // options.instanceState = SERVICE_STATUS.stopped
            const output = yield this.runDestroy(options);
            logger.info(`[DESTROY]Done`, this.request);
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
    getStatObject(metric) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const metricName = metric || 'cloudwatch';
            const stat = yield this.getStat();
            const objects = (_a = stat === null || stat === void 0 ? void 0 : stat.objects) === null || _a === void 0 ? void 0 : _a.filter((o) => o.metric === metricName);
            if ((objects === null || objects === void 0 ? void 0 : objects.length) === 0) {
                logger.warn(`[METRIC][${this.deployment.name}] cloudwatch objects not found!`);
                return;
            }
            const object = objects[0];
            if (!object.dimensionValue) {
                logger.warn(`[METRIC][${this.deployment.name}] cloudwatch.dimensionValue not found!`);
                return;
            }
            logger.info(`[METRIC][${this.deployment.name}] cloudwatch object=`, object);
            return object;
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
            logger.info(`[METRIC]`, metricData);
            // total: number;
            // dates: Date[];
            // series?: MetricItemSeries[];
            // values?: number[];
            // summary?: AnyObject[];
            return metricData;
        });
    }
    /**
     * terraform plan
     * @param stream
     * @param shell
     * @param store
     * @param plugin
     * @param options
     */
    runPlan(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = yield this.getStream();
            const shell = yield this.getShell();
            const identifier = options.identifier;
            logger.info(`[PLAN][${identifier}]            ---------------------------`);
            try {
                // preparing
                yield this.runReady(stream, shell, this.store, this.plugin, options);
                // plan
                yield this.runCommand(stream, shell, `terraform plan`, identifier);
                logger.info(`[PLAN][${identifier}]Done        ---------------------------`);
            }
            catch (err) {
                logger.warn(`[PLAN][${identifier}]Error       ---------------------------`);
                logger.warn(err);
                throw err;
            }
        });
    }
    /**
     * terraform apply
     * @param stream
     * @param shell
     * @param store
     * @param plugin
     * @param options
     */
    runApply(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = yield this.getStream();
            const shell = yield this.getShell();
            const identifier = options.identifier;
            logger.info(`[APPLY][${identifier}]           ---------------------------`);
            try {
                // preparing
                yield this.runReady(stream, shell, this.store, this.plugin, options);
                // apply 
                yield this.runCommand(stream, shell, `terraform apply --auto-approve`, identifier);
                logger.info(`[APPLY][${identifier}]Done       ---------------------------`);
                // read & save output
                yield this.saveOutput(stream, shell, options);
            }
            catch (err) {
                logger.warn(`[APPLY][${identifier}]Error      ---------------------------`);
                logger.warn(err);
                throw err;
            }
            finally {
                // save terraform.tfsate
                // It must be saved even in case of failure.
                yield this.saveState(shell, this.store);
            }
        });
    }
    /**
     * terraform destroy
     * @param stream
     * @param shell
     * @param store
     * @param plugin
     * @param options
     */
    runDestroy(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = yield this.getStream();
            const shell = yield this.getShell();
            const identifier = options.identifier;
            logger.info(`[DESTROY][${identifier}]         ---------------------------`);
            try {
                // preparing
                yield this.runReady(stream, shell, this.store, this.plugin, options);
                // destroy
                yield this.runCommand(stream, shell, `terraform destroy --auto-approve`, identifier);
                logger.info(`[DESTROY][${identifier}]Done     ---------------------------`);
            }
            catch (err) {
                logger.warn(`[DESTROY][${identifier}]Error    ---------------------------`);
                logger.warn(err);
                throw err;
            }
            finally {
                // save terraform.tfsate
                // It must be saved even in case of failure.
                yield this.saveState(shell, this.store);
            }
        });
    }
    /**
     * preparing to the terraform command (plan, apply, destory)
     * @param stream
     * @param shell
     * @param store
     * @param plugin
     * @param options
     */
    runReady(stream, shell, store, plugin, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // terraform file write 
            yield this.writeTerraformFile(stream, shell, options);
            // export AWS key
            yield this.exportEvn(stream, shell, plugin, options.env);
            // run init
            yield this.runCommand(stream, shell, 'terraform init', options.identifier);
            // state file write
            yield this.writeStateFile(stream, shell, store);
            // additional file write
            yield this.writeAdditionalFile(stream, shell, store);
        });
    }
    /**
     * generate a terraform file
     * @param stream
     * @param shell
     * @param dirname
     * @param tfVarScript
     * @param state
     * @param plan
     */
    writeTerraformFile(stream, shell, options) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[WRITE][${options.identifier}]            ---------------------------`);
            const dirname = this.getDirname();
            // file write ////////////////////////////////////////////////////////////////////////
            // file write to Agent(main.tf, ...)
            for (const filePath of TF_FILES) {
                const fileName = path_1.default.basename(filePath);
                stream.write(`- create file ${fileName}\n`);
                yield shell.writeFile(`${fileName}`, fs_1.default.readFileSync(path_1.default.join(dirname, filePath)).toString());
            }
            // file write to Agent(terraform.tfvars)
            stream.write(`- create file "terraform.tfvars"\n`);
            const tfVarScript = (0, es6_template_string_1.default)(fs_1.default.readFileSync(path_1.default.join(dirname, TFVARS_FILE)).toString(), options);
            yield shell.writeFile(`terraform.tfvars`, tfVarScript);
            stream.write(`${tfVarScript}\n`);
            logger.info(`tfVars=`, tfVarScript);
        });
    }
    /**
     * export AccessKey
     * @param stream
     * @param shell
     * @param plugin
     * @param env
     */
    exportEvn(stream, shell, plugin, env) {
        return __awaiter(this, void 0, void 0, function* () {
            // logger.info(`exportEnv---------------------------------------------------------------`);
            var _a, _b;
            // export ////////////////////////////////////////////////////////////////////////////
            // export AccessKey
            stream.write(`- setup credentials for ${PROVIDER}\n`);
            // set auto setup env from plugin options, if supported provider
            if (PROVIDER === 'aws') {
                const AWS_ACCESS_KEY_ID = ((_a = plugin === null || plugin === void 0 ? void 0 : plugin.options) === null || _a === void 0 ? void 0 : _a.AWS_ACCESS_KEY_ID) || process.env.AWS_ACCESS_KEY_ID;
                const AWS_SECRET_ACCESS_KEY = ((_b = plugin === null || plugin === void 0 ? void 0 : plugin.options) === null || _b === void 0 ? void 0 : _b.AWS_SECRET_ACCESS_KEY) || process.env.AWS_SECRET_ACCESS_KEY;
                if (!AWS_ACCESS_KEY_ID)
                    throw new Error(`plugin.config.AWS_ACCESS_KEY_ID is required`);
                if (!AWS_ACCESS_KEY_ID)
                    throw new Error(`plugin.config.AWS_SECRET_ACCESS_KEY is required`);
                // exec command
                yield shell.exec(`export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"`);
                yield shell.exec(`export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"`);
            }
            else if (!PROVIDER) {
                throw new Error(`unsuported provider: ${PROVIDER}`);
            }
            // export env
            // const exportCommands = Object.keys(env).map((key: string) => `export ${key}="${env[key] || ''}"`);
            // if (exportCommands?.length) await shell.exec(exportCommands.join('\n'));
        });
    }
    /**
     * generate a terraform.tfstate file
     * @param stream
     * @param shell
     * @param state
     * @param identifier
     */
    writeStateFile(stream, shell, store) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield store.load('tfstate');
            // restore previous tfstate if exist
            if (state) {
                stream.write(`- restore state file "${TFSTATE_FILE}"\n`);
                yield shell.exec(`mkdir .state`);
                yield shell.writeFile(TFSTATE_FILE, state);
            }
        });
    }
    /**
     * if extra files are required for Terraform execution
     * @param stream
     * @param shell
     * @param store
     */
    writeAdditionalFile(stream, shell, store) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    /**
     * running a command
     * @param stream
     * @param shell
     * @param command
     * @param deploymentName
     * @returns
     */
    runCommand(stream, shell, command, identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield shell.exec(`${command}`, { stream });
            // stream.write(result + '\n');
            // stream.write(`${command} Done! ---------------------------------\n`);
            return result;
        });
    }
    /**
     * after apply or destory
     * save the terraform.tfstate file
     * @param shell
     * @param store
     */
    saveState(shell, store) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield shell.readFile(TFSTATE_FILE);
            if (state) {
                yield store.save('tfstate', state);
            }
        });
    }
    /**
     * get output
     * @param stream
     * @param shell
     * @param key
     * @param identifier
     * @returns
     */
    getOutput(stream, shell, key, identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let value = yield this.runCommand(stream, shell, `terraform output --json ${key}`, identifier);
                value = value.trim();
                value = (value.startsWith('"') && value.endsWith('"')) ? value.substring(1, value.length - 1) : value;
                // logger.debug(`[${deploymentName}]${key}=${value}`);
                return value;
            }
            catch (err) {
                logger.warn(err);
            }
        });
    }
}
exports.AwsAppController = AwsAppController;
//# sourceMappingURL=AwsAppController.js.map