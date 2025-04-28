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
exports.AwsECSApi = void 0;
const runtime_1 = require("@ale-run/runtime");
const client_ecs_1 = require("@aws-sdk/client-ecs");
const logger = runtime_1.Logger.getLogger('app:AwsECSApi');
/**
 * AWS ECS
 */
class AwsECSApi {
    getClient(region) {
        const config = {
            region
        };
        const client = new client_ecs_1.ECSClient(config);
        return client;
    }
    listTasks(region, cluster, serviceName) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug('listTasks');
            const client = this.getClient(region);
            const input = {
                'cluster': cluster,
                'serviceName': serviceName,
            };
            try {
                const command = new client_ecs_1.ListTasksCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug('taskArns', response.taskArns);
                    return response.taskArns;
                }
                // return undefined;
            }
            catch (err) {
                logger.error('listTasks Error ===============================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    describeTaskNWaiting(region, cluster, serviceName) {
        return __awaiter(this, void 0, void 0, function* () {
            let task = undefined;
            for (let i = 0; i < 60; i++) {
                task = yield this.describeTask(region, cluster, serviceName);
                yield this.sleep(10000);
                if (task)
                    break;
            }
            return task;
        });
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/APIReference/API_DescribeTasks.html
    describeTask(region, cluster, serviceName) {
        return __awaiter(this, void 0, void 0, function* () {
            const taskArns = yield this.listTasks(region, cluster, serviceName);
            if (taskArns === undefined || taskArns.length === 0) {
                logger.error(`${serviceName} taskArn not found!!!!`);
                return undefined;
            }
            const client = this.getClient(region);
            const input = {
                'cluster': cluster,
                'tasks': taskArns
            };
            try {
                const command = new client_ecs_1.DescribeTasksCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug('tasks', response.tasks);
                    return response.tasks[0];
                }
                // return undefined;
            }
            catch (err) {
                logger.error('describeTask Error ===========================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ecs/command/DescribeTaskDefinitionCommand/
    describeTaskDefinition(region, taskDefinition) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug('describeTaskDefinition');
            const client = this.getClient(region);
            const input = {
                'taskDefinition': taskDefinition
            };
            try {
                const command = new client_ecs_1.DescribeTaskDefinitionCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug('taskDefinition', response.taskDefinition);
                    return response.taskDefinition;
                }
                // return undefined;
            }
            catch (err) {
                logger.error('describeTaskDefinition Error ==================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ecs/command/DescribeServicesCommand/
    describeService(region, cluster, serviceName) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug('describeService');
            const client = this.getClient(region);
            const input = {
                'cluster': cluster,
                'services': [serviceName]
            };
            try {
                const command = new client_ecs_1.DescribeServicesCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug('taskDefinition', response.services);
                    return response.services[0];
                }
            }
            catch (err) {
                logger.error('describeService Error ==================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
}
exports.AwsECSApi = AwsECSApi;
//# sourceMappingURL=AwsECSApi.js.map