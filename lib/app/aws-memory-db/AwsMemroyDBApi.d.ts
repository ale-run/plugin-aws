import { Cluster } from '@aws-sdk/client-memorydb';
export declare class AwsMemroyDBApi {
    private getClient;
    describe(region: string, identifier: string): Promise<Cluster | undefined>;
}
