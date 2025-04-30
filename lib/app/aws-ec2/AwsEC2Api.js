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
exports.AwsEC2Api = void 0;
const runtime_1 = require("@ale-run/runtime");
const client_ec2_1 = require("@aws-sdk/client-ec2");
const logger = runtime_1.Logger.getLogger('app:AwsEC2Api');
/**
 * AWS EC2
 */
class AwsEC2Api {
    getClient(region) {
        const config = {
            region
        };
        const client = new client_ec2_1.EC2Client(config);
        return client;
    }
    /**
     * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_DescribeImages_section.html
     * @param region
     * @param amiId
     * @returns
     */
    describeImage(region, amiId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.getClient(region);
            const input = {
                ImageIds: [amiId]
            };
            try {
                const command = new client_ec2_1.DescribeImagesCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug(`[describeImage][${amiId}]`, response.Images);
                    return response.Images[0];
                }
            }
            catch (err) {
                logger.error('describeImage Error ===========================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    /**
     * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_StartInstances_section.html
     * @param region
     * @param instanceId
     * @returns
     */
    startInstance(region, instanceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.getClient(region);
            const input = {
                InstanceIds: [instanceId]
            };
            try {
                const command = new client_ec2_1.StartInstancesCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug(`[startInstance][${instanceId}]`, response.StartingInstances);
                    return response.StartingInstances[0];
                }
            }
            catch (err) {
                logger.error('startInstance Error ===========================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    /**
     * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_StopInstances_section.html
     * @param region
     * @param instanceId
     * @returns
     */
    stopInstance(region, instanceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.getClient(region);
            const input = {
                InstanceIds: [instanceId]
            };
            try {
                const command = new client_ec2_1.StopInstancesCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug(`[stopInstance][${instanceId}]`, response.StoppingInstances);
                    return response.StoppingInstances[0];
                }
            }
            catch (err) {
                logger.error('stopInstance Error ===========================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    /**
     *
     * @param region
     * @param instanceName
     * @returns
     */
    describeInstance(region, instanceName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const client = this.getClient(region);
            const input = {
                Filters: [
                    {
                        Name: 'tag:Name',
                        Values: [instanceName],
                    },
                ]
            };
            try {
                const command = new client_ec2_1.DescribeInstancesCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.info(`[describeInstance][${instanceName}]`, response.Reservations);
                    const instances = (_b = (_a = response.Reservations) === null || _a === void 0 ? void 0 : _a.flatMap(r => { var _a; return (_a = r.Instances) !== null && _a !== void 0 ? _a : []; })) !== null && _b !== void 0 ? _b : [];
                    logger.debug(`[describeInstance][${instanceName}]`, instances);
                    return instances === null || instances === void 0 ? void 0 : instances[0];
                }
            }
            catch (err) {
                logger.error('describeInstance Error ===========================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    /**
     *
     * @param region
     * @param instanceId
     * @returns
     */
    describeVolumes(region, instanceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.getClient(region);
            const input = {
                Filters: [
                    {
                        Name: 'attachment.instance-id',
                        Values: [instanceId] // 원하는 EC2 인스턴스 ID
                    }
                ]
            };
            try {
                const command = new client_ec2_1.DescribeVolumesCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug(`[describeVolumes][${instanceId}]`, response.Volumes);
                    return response.Volumes;
                }
            }
            catch (err) {
                logger.error('describeVolumes Error ===========================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
}
exports.AwsEC2Api = AwsEC2Api;
//# sourceMappingURL=AwsEC2Api.js.map