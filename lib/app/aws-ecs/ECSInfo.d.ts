import { Task, TaskDefinition } from '@aws-sdk/client-ecs';
import { LoadBalancer } from '@aws-sdk/client-elastic-load-balancing-v2';
export declare class ECSInfo {
    deployed: boolean;
    desiredCount: number;
    runningCount: number;
    taskDefinition?: TaskDefinition;
    loadBalancer?: LoadBalancer;
    task?: Task;
}
