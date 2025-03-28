import { DBInstance } from '@aws-sdk/client-rds';
export declare class AwsRDSApi {
    private getClient;
    /**
     * stop RDS
     * @param region
     * @param identifier
     * @returns
     */
    stop(region: string, identifier: string): Promise<string | undefined>;
    /**
     * start RDS
     * @param region
     * @param identifier
     * @returns
     */
    start(region: string, identifier: string): Promise<string | undefined>;
    /**
     * describe RDS
     * @param region
     * @param identifier
     * @returns
     */
    describe(region: string, identifier: string): Promise<DBInstance | undefined>;
    /**
     * Waiting until the status is 'targetStatus'
     * @param region
     * @param identifier
     * @param targetStatus
     * @returns
     */
    waiting(region: string, identifier: string, targetStatus: string): Promise<string | undefined>;
    sleep(ms: number): Promise<void>;
}
