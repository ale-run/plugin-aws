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
exports.AwsELBApi = void 0;
const runtime_1 = require("@ale-run/runtime");
const client_elastic_load_balancing_v2_1 = require("@aws-sdk/client-elastic-load-balancing-v2");
const logger = runtime_1.Logger.getLogger('app:AwsECSApi');
/**
 * AWS ELB
 */
class AwsELBApi {
    getClient(region) {
        const config = {
            region
        };
        const client = new client_elastic_load_balancing_v2_1.ElasticLoadBalancingV2Client(config);
        return client;
    }
    describeTargetGroup(region, targetGroupArn) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug('describeTargetGroup =================================');
            const client = this.getClient(region);
            const input = {
                'TargetGroupArns': [targetGroupArn]
            };
            try {
                const command = new client_elastic_load_balancing_v2_1.DescribeTargetGroupsCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug('TargetGroups', response.TargetGroups);
                    return response.TargetGroups[0];
                }
            }
            catch (err) {
                logger.error('describeTargetGroup Error ===========================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
            return undefined;
        });
    }
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/elastic-load-balancing-v2/command/DescribeLoadBalancersCommand/
    describeLoadBalancer(region, loadBalancerArn) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug('describeLoadBalancer =================================');
            const client = this.getClient(region);
            const input = {
                'LoadBalancerArns': [loadBalancerArn]
            };
            try {
                const command = new client_elastic_load_balancing_v2_1.DescribeLoadBalancersCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    logger.debug('LoadBalancers', response.LoadBalancers);
                    return response.LoadBalancers[0];
                }
            }
            catch (err) {
                logger.error('describeLoadBalancer Error ==================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
}
exports.AwsELBApi = AwsELBApi;
//# sourceMappingURL=AwsELBApi.js.map