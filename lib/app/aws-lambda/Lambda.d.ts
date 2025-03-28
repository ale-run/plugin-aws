import { AWS } from '../AWS';
export declare class Lambda extends AWS {
    runtime: string;
    sourceDir: string;
    sourceFileName: string;
    input?: string;
}
