import { AWS } from '../AWS';

export declare class Lambda extends AWS {

    //region: string;
    // functionName: string;
    runtime: string;
    sourceDir: string;
    sourceFileName: string;
    input?: string;
    // env?: any;

}
