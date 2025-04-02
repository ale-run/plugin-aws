import { AWS } from '../AWS';
export declare class EC2 extends AWS {
    instanceType: string;
    subnetId: string;
    associatePublicIpAddress: boolean;
    volumeSize: number;
    instanceState?: string;
}
