import { AWS } from '../AWS';
import { Volume } from './Volume';

export class ECS extends AWS {

    subnetIds?: string[];
    publicSubnetIds?: string[];

    clusterName: string;
    taskRoleName: string;

    containerName: string;
    containerImage: string;
    containerPort: number;
    containerVolumes: Volume[];
    efsName?: string;

    serviceName: string;
    launchType: string;
    

    desiredCount: number;

    environments: any[];
}
