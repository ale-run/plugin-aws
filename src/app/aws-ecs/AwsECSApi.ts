import { Logger } from '@ale-run/runtime';
import { DescribeServicesCommand, DescribeTaskDefinitionCommand, DescribeTasksCommand, ECSClient, ListTasksCommand, Service, Task, TaskDefinition } from '@aws-sdk/client-ecs';

const logger = Logger.getLogger('app:AwsECSApi');

/**
 * AWS ECS
 */
export class AwsECSApi {


  private getClient(region: string): ECSClient {
    const config = {
      region
    }
    const client = new ECSClient(config)
    return client;

  }

  public async listTasks(region: string, cluster: string, serviceName: string): Promise<string[]> {

    logger.debug('listTasks');
    const client = this.getClient(region);
    const input =
    {
      'cluster': cluster,
      'serviceName': serviceName,
    }

    try {

      const command = new ListTasksCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug('taskArns', response.taskArns);
        return response.taskArns;
      }

      // return undefined;
      

    } catch (err) {
      logger.error('listTasks Error ===============================================')
      logger.error(input)
      logger.error(err)

    } finally {
      client.destroy();
    }
  }

  public async describeTaskNWaiting(region: string, cluster: string, serviceName: string): Promise<Task> {
    let task = undefined;

        for(let i = 0; i < 60; i++) {
          task = await this.describeTask(region, cluster, serviceName);
          await this.sleep(10000)
            
            if (task) break;
        }
        return task;
  }

  sleep(ms: number): Promise<void> {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }


  // https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/APIReference/API_DescribeTasks.html
  public async describeTask(region: string, cluster: string, serviceName: string): Promise<Task> | undefined {

    const taskArns = await this.listTasks(region, cluster, serviceName)
    if (taskArns === undefined || taskArns.length === 0 ) {
      logger.error(`${serviceName} taskArn not found!!!!`)
      return undefined;
    }

    const client = this.getClient(region);
    const input =
    {
      'cluster': cluster,
      'tasks': taskArns
    }

    try {

      const command = new DescribeTasksCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug('tasks', response.tasks);
        return response.tasks[0];
      }

      // return undefined;

    } catch (err) {
      logger.error('describeTask Error ===========================================')
      logger.error(input)
      logger.error(err)
    } finally {
      client.destroy();
    }

  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ecs/command/DescribeTaskDefinitionCommand/
  public async describeTaskDefinition(region: string, taskDefinition: string): Promise<TaskDefinition> {

    logger.debug('describeTaskDefinition');
    const client = this.getClient(region);
    const input = {
      'taskDefinition': taskDefinition
    };

    try {

      const command = new DescribeTaskDefinitionCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug('taskDefinition', response.taskDefinition);
        return response.taskDefinition;
      }

      // return undefined;

    } catch (err) {
      logger.error('describeTaskDefinition Error ==================================')
      logger.error(input)
      logger.error(err)
    } finally {
      client.destroy();
    }

  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ecs/command/DescribeServicesCommand/
  public async describeService(region: string, cluster: string, serviceName: string): Promise<Service> {

    logger.debug('describeService');
    const client = this.getClient(region);
    const input = {
      'cluster': cluster,
      'services': [serviceName]
    };

    try {

      const command = new DescribeServicesCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        logger.debug('taskDefinition', response.services);
        return response.services[0];
      }

    } catch (err) {
      logger.error('describeService Error ==================================')
      logger.error(input)
      logger.error(err)
    } finally {
      client.destroy();
    }

  }

}