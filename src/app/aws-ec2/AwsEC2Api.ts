import { Logger } from '@ale-run/runtime';
import { EC2Client, Image, DescribeImagesCommand, InstanceStateChange, StartInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';

const logger = Logger.getLogger('app:AwsEC2Api');

/**
 * AWS EC2
 */
export class AwsEC2Api {


  private getClient(region: string): EC2Client {
    const config = {
      region
    }
    const client = new EC2Client(config)
    return client;

  }

  /**
   * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_DescribeImages_section.html
   * @param region 
   * @param amiId 
   * @returns 
   */
   public async describeImage(region: string, amiId: string): Promise<Image> | undefined {

    const client = this.getClient(region);
    const input =
    {
      ImageIds: [amiId]
    };

    try {

      const command = new DescribeImagesCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug(`[describeImage][${amiId}]`, response.Images);
        return response.Images[0];
      }

    } catch (err) {
      logger.error('describeImage Error ===========================================')
      logger.error(input)
      logger.error(err)
    } finally {
      client.destroy();
    }

  }

  /**
   * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_StartInstances_section.html
   * @param region 
   * @param instanceId 
   * @returns 
   */
  public async startInstance(region: string, instanceId: string): Promise<InstanceStateChange> | undefined {

    const client = this.getClient(region);
    const input =
    {
      InstanceIds: [instanceId]
    };

    try {

      const command = new StartInstancesCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug(`[startInstance][${instanceId}]`, response.StartingInstances);
        return response.StartingInstances[0];
      }

    } catch (err) {
      logger.error('startInstance Error ===========================================')
      logger.error(input)
      logger.error(err)
    } finally {
      client.destroy();
    }

  }

  /**
   * https://docs.aws.amazon.com/code-library/latest/ug/ec2_example_ec2_StopInstances_section.html
   * @param region 
   * @param instanceId 
   * @returns 
   */
  public async stopInstance(region: string, instanceId: string): Promise<InstanceStateChange> | undefined {

    const client = this.getClient(region);
    const input =
    {
      InstanceIds: [instanceId]
    };

    try {

      const command = new StopInstancesCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug(`[stopInstance][${instanceId}]`, response.StoppingInstances);
        return response.StoppingInstances[0];
      }

    } catch (err) {
      logger.error('stopInstance Error ===========================================')
      logger.error(input)
      logger.error(err)
    } finally {
      client.destroy();
    }

  }


}