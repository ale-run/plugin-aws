import { AWS } from "../AWS";
import { Volume } from "./Volume";

export class ECS extends AWS {

    clusterName: string;
    efsName: string;
    taskRoleName: string;
    containerName: string;
    containerImage: string;
    containerPort: number;
    containerVolumes: Volume[];
    serviceName: string;
    launchType: string;
    desiredCount: number;

    environments: any[];
}
