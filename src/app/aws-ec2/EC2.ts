import { AWS } from '../AWS';

export class EC2 extends AWS {

    instanceType: string;
    subnetTier: string;
    subnetZone: string;
    volumeSize: number;
    instanceState?: string;
    // env?: any;

}
