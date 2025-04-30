import { AWS } from '../AWS';

export class EC2 extends AWS {

    instanceType: string;
    subnetId: string;
    amiId: string;
    imageName?: string;
    associatePublicIpAddress: boolean;
    // subnetTier: string;
    // subnetZone: string;
    volumeSize: number;
    username?: string;
    // instanceState?: string;

}
