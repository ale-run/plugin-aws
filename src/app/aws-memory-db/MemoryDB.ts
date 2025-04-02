import { AWS } from '../AWS';

export declare class MemoryDB extends AWS {

    engine: string;
    engineVersion: string;
    subnetIds: string[];
    subnetGroupName: string;
    instanceClass: string;
 
}
