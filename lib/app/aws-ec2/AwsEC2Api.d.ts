import { Image, InstanceStateChange } from '@aws-sdk/client-ec2';
/**
 * AWS EC2
 */
export declare class AwsEC2Api {
    private getClient;
    /**
     * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_DescribeImages_section.html
     * @param region
     * @param amiId
     * @returns
     */
    describeImage(region: string, amiId: string): Promise<Image> | undefined;
    /**
     * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_StartInstances_section.html
     * @param region
     * @param instanceId
     * @returns
     */
    startInstance(region: string, instanceId: string): Promise<InstanceStateChange> | undefined;
    /**
     * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_StopInstances_section.html
     * @param region
     * @param instanceId
     * @returns
     */
    stopInstance(region: string, instanceId: string): Promise<InstanceStateChange> | undefined;
}
