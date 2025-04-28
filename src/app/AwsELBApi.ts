import { Logger } from '@ale-run/runtime';
import { DescribeLoadBalancersCommand, DescribeTargetGroupsCommand, ElasticLoadBalancingV2Client, LoadBalancer, TargetGroup } from '@aws-sdk/client-elastic-load-balancing-v2';

const logger = Logger.getLogger('app:AwsECSApi');

/**
 * AWS ELB
 */
export class AwsELBApi {


  private getClient(region: string): ElasticLoadBalancingV2Client {
    const config = {
      region
    }
    const client = new ElasticLoadBalancingV2Client(config)
    return client;

  }


  public async describeTargetGroup(region: string, targetGroupArn: string): Promise<TargetGroup> {

    logger.debug('describeTargetGroup =================================')
    const client = this.getClient(region);
    const input = {
      'TargetGroupArns': [targetGroupArn]
    };

    try {
      const command = new DescribeTargetGroupsCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug('TargetGroups', response.TargetGroups);
        return response.TargetGroups[0];
      }

    } catch (err) {
      logger.error('describeTargetGroup Error ===========================')
      logger.error(input)
      logger.error(err)
    } finally {
      client.destroy();
    }

    return undefined;

  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/elastic-load-balancing-v2/command/DescribeLoadBalancersCommand/
  public async describeLoadBalancer(region: string, loadBalancerArn: string): Promise<LoadBalancer> {

    logger.debug('describeLoadBalancer =================================')
    const client = this.getClient(region);
    const input = {
      'LoadBalancerArns': [loadBalancerArn]
    };

    try {
      const command = new DescribeLoadBalancersCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug('LoadBalancers', response.LoadBalancers);
        return response.LoadBalancers[0];
      }

    } catch (err) {
      logger.error('describeLoadBalancer Error ==================================')
      logger.error(input)
      logger.error(err)
    } finally {
      client.destroy();
    }

  }

}