import { Service, Task, TaskDefinition} from '@aws-sdk/client-ecs';
import { LoadBalancer } from '@aws-sdk/client-elastic-load-balancing-v2';

export class ECSInfo {
    desiredCount: number;
    runningCount: number;
    // service?: Service;
    taskDefinition?: TaskDefinition;
    loadBalancer?: LoadBalancer;
    task?: Task;
}

