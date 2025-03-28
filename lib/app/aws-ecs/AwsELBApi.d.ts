import { LoadBalancer, TargetGroup } from '@aws-sdk/client-elastic-load-balancing-v2';
/**
 * AWS ELB
 */
export declare class AwsELBApi {
    private getClient;
    describeTargetGroup(region: string, targetGroupArn: string): Promise<TargetGroup>;
    describeLoadBalancer(region: string, loadBalancerArn: string): Promise<LoadBalancer>;
}
