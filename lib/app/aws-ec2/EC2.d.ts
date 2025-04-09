import { AWS } from '../AWS';
export declare class EC2 extends AWS {
    instanceType: string;
    subnetId: string;
    amiId: string;
    imageName?: string;
    associatePublicIpAddress: boolean;
    volumeSize: number;
    username?: string;
}
