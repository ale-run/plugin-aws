import { AWS } from '../AWS';
export declare class RDS extends AWS {
    engine: string;
    engineVersion: string;
    dbSubnetGroupName: string;
    instanceClass: string;
    username: string;
    password: string;
}
