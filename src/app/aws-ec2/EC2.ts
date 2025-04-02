import { AWS } from '../AWS';

export class EC2 extends AWS {

    instanceType: string;
    subnetId: string;
    associatePublicIpAddress: boolean;
    // subnetTier: string;
    // subnetZone: string;
    volumeSize: number;
    instanceState?: string;

}
