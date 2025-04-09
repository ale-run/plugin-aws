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
const runtime_1 = require("@ale-run/runtime");
const AwsAppController_1 = require("../AwsAppController");
const stream_1 = require("stream");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const path_1 = __importDefault(require("path"));
const AwsCloudwatchLogApi_1 = require("../AwsCloudwatchLogApi");
const logger = runtime_1.Logger.getLogger('app:AwsLambdaApp');
const SOURCE_DIR = 'source';
class AwsLambdaApp extends AwsAppController_1.AwsAppController {
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
            var _a, _b, _c;
            // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
            let region = this.request.options.region || ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.REGION);
            // Underscores ('_') are not allowed in Terraform
            let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
            let runtime = this.request.options.runtime;
            let sourceFileName = this.request.options.sourceFileName;
            const inputParameter = this.request.options.inputParameter;
            const env = this.resolveEnv((_c = this.request.options) === null || _c === void 0 ? void 0 : _c.env);
            // inputParameter to {key=value}
            let input = '';
            if (inputParameter && inputParameter.length > 0) {
                for (const p of inputParameter) {
                    input += `"${p.name}"="${p.value}",`;
                }
                input = input.substring(0, input.length - 1);
            }
            const prevOptions = yield this.store.loadObject('option');
            // This setting is fixed and cannot be updated.
            if (prevOptions) {
                region = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.region;
                identifier = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.identifier;
                runtime = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.runtime;
                sourceFileName = prevOptions === null || prevOptions === void 0 ? void 0 : prevOptions.sourceFileName;
            }
            if (!region)
                throw new Error(`options 'Region' is required`);
            if (!runtime)
                throw new Error(`options 'Runtime Language' is required`);
            if (!sourceFileName)
                throw new Error(`options 'source File Name' is required`);
            const options = {
                region,
                identifier,
                runtime,
                sourceDir: SOURCE_DIR,
                sourceFileName,
                input,
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
            // output 
            const functionName = yield this.getOutput(stream, shell, 'function_name');
            const runtime = yield this.getOutput(stream, shell, 'runtime');
            const lastModified = yield this.getOutput(stream, shell, 'last_modified');
            const logGroupArn = yield this.getOutput(stream, shell, 'log_group_arn');
            const functionUrl = yield this.getOutput(stream, shell, 'function_url');
            const authorizationType = yield this.getOutput(stream, shell, 'authorization_type');
            const result = yield this.getOutput(stream, shell, 'result');
            // save
            yield this.store.save('info', {
                functionName,
                runtime,
                lastModified,
                logGroupArn,
                functionUrl,
                authorizationType,
                result,
            });
        });
    }
    /**
     * AppController.deploy
     * terraform plan 실행
     */
    deploy() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[DEPLOY]`, this.request);
            const options = yield this.readOptions();
            // read & save Source
            const source = yield this.readSource(options);
            yield this.runPlan(options);
            logger.info(`[DEPLOY]done`, this.request.name);
        });
    }
    /**
     * AppController.stop
     *
     */
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[STOP]`, this.request.name);
            logger.info(`[STOP]This request is skipped`);
            // logger.info(`[STOP]Done`, this.request);
        });
    }
    readSource(option) {
        return __awaiter(this, void 0, void 0, function* () {
            // {
            //   "name":"lambda-test",
            //   "app":"aws-lambda",
            //   "context":
            //   {
            //     "git":
            //     {
            //       "url":"https://github.com//lambda-test.git",
            //       "branch":"main"
            //     },
            //     "preset":"aws-lambda"
            //   }
            // } 
            const stream = yield this.getStream();
            const shell = yield this.getShell();
            const git = Object.assign({}, (this.request.context && this.request.context.git) || {}, (this.request.options && this.request.options.git) || {});
            if (!git || !git.url)
                throw new Error(`options.git is required`);
            // git clone
            const gitResult = yield shell.clone('repo', git.url, { branch: git.branch });
            stream.write('git clone: ' + JSON.stringify(gitResult, null, 2) + '\n');
            // read sourceCode
            const sourceCode = yield shell.readFile(path_1.default.join('repo', option.sourceFileName), { stream });
            // save sourceCode
            yield this.store.save('source', sourceCode);
            return sourceCode;
        });
    }
    /**
     * AwsAppController.writeAdditionalFile
     * @param stream
     * @param shell
     * @param store
     */
    writeAdditionalFile(stream, shell, store) {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceDir = 'source';
            const sourceFileName = 'index.js';
            const source = yield store.load('source');
            if (source) {
                stream.write(`- create file "${sourceDir}/${sourceFileName}"\n`);
                yield shell.exec(`mkdir ${sourceDir}`);
                yield shell.writeFile(path_1.default.join(sourceDir, sourceFileName), source);
            }
        });
    }
    /**
     * AppController.logs
     * log tail via AwsCloudwatchLogApi(aws sdk)
     * @param id
     * @param options
     * @returns
     */
    logs(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = new stream_1.PassThrough();
            const op = yield this.store.loadObject('option');
            const info = yield this.store.loadObject('info');
            if (!info) {
                logger.info('cloudwatch log group not ready! Please try again later');
                stream.write('cloudwatch log group not ready! Please try again later');
                stream.end();
                return stream;
            }
            const region = op === null || op === void 0 ? void 0 : op.region;
            const arn = info === null || info === void 0 ? void 0 : info.logGroupArn;
            const logApi = new AwsCloudwatchLogApi_1.AwsCloudwatchLogApi(region, arn, stream);
            yield logApi.getLogs();
            logApi.startLiveTail();
            return stream;
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
            const status = yield this.store.load('status');
            // workload(function 정보)
            const workload = {
                kind: 'workload',
                name: options.identifier,
                displayName: options.identifier,
                replicas: status === 'running' ? 1 : 0,
                ready: status === 'running' ? 1 : 0,
                description: { runtime: info === null || info === void 0 ? void 0 : info.runtime, lastModified: info === null || info === void 0 ? void 0 : info.lastModified },
            };
            deployedObjects.push(workload);
            // function url 정보
            const ingress = {
                kind: 'ingress',
                name: info === null || info === void 0 ? void 0 : info.functionName,
                type: 'https',
                entrypoints: [info === null || info === void 0 ? void 0 : info.functionUrl],
                description: { authorizationType: info === null || info === void 0 ? void 0 : info.authorizationType }
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
            const info = yield this.store.loadObject('info');
            const option = yield this.store.loadObject('option');
            const status = yield this.store.load('status');
            const statObject = {
                region: option === null || option === void 0 ? void 0 : option.region,
                metric: 'cloudwatch',
                namespace: 'AWS/Lambda',
                dimensionName: 'FunctionName',
                dimensionValue: info === null || info === void 0 ? void 0 : info.functionName,
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
                    name: 'Invocations',
                    title: 'Invocations',
                    unit: ''
                },
                {
                    name: 'Duration',
                    title: 'Duration',
                    unit: 'Milliseconds'
                },
                {
                    name: 'Errors',
                    title: 'Errors',
                    unit: ''
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
            const metricObject = yield this.getStatObject();
            if (metricObject === undefined)
                return;
            let metricData = null;
            switch (name) {
                case 'Duration':
                    metricData = yield this.cloudwatchApi.getMetricData(name, client_cloudwatch_1.Statistic.Average, metricObject, options);
                    break;
                case 'Invocations':
                case 'Errors':
                    metricData = yield this.cloudwatchApi.getMetricData(name, client_cloudwatch_1.Statistic.Sum, metricObject, options);
                    break;
            }
            logger.info(`[METRIC]`, metricData);
            return metricData;
        });
    }
}
exports.default = AwsLambdaApp;
//# sourceMappingURL=AwsLambdaApp.js.map