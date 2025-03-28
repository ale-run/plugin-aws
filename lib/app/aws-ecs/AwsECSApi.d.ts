import { Service, Task, TaskDefinition } from '@aws-sdk/client-ecs';
/**
 * AWS ECS
 */
export declare class AwsECSApi {
    private getClient;
    listTasks(region: string, cluster: string, serviceName: string): Promise<string[]>;
    describeTaskNWaiting(region: string, cluster: string, serviceName: string): Promise<Task>;
    sleep(ms: number): Promise<void>;
    describeTask(region: string, cluster: string, serviceName: string): Promise<Task> | undefined;
    describeTaskDefinition(region: string, taskDefinition: string): Promise<TaskDefinition>;
    describeService(region: string, cluster: string, serviceName: string): Promise<Service>;
}
