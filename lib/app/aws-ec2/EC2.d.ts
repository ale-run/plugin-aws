import { AWS } from '../AWS';
export declare class EC2 extends AWS {
    instanceType: string;
    subnetTier: string;
    subnetZone: string;
    volumeSize: number;
    instanceState?: string;
}
