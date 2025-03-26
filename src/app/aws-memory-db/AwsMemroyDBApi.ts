import { Logger } from '@ale-run/runtime';
import { Cluster, DescribeClustersCommand, MemoryDBClient } from '@aws-sdk/client-memorydb';

const logger = Logger.getLogger('app:AwsMemroyDBApi');

export class AwsMemroyDBApi {

    private getClient(region: string): MemoryDBClient {
        const config = {
            region
        }
        const client = new MemoryDBClient(config)
        return client;

    }


    public async describe(region: string, identifier: string): Promise<Cluster | undefined> {

        logger.debug(`[${identifier}]describe`);
        const client = this.getClient(region);

        const input = {
            ClusterName: identifier,
            ShowShardDetails: true
        };

        try {

            const command = new DescribeClustersCommand(input);
            const response = await client.send(command);

            if (response.$metadata.httpStatusCode === 200) {
                return response.Clusters[0];
            }

        } catch (err) {
            logger.error('Error ===============================================')
            logger.error(input)
            logger.error(err)

        } finally {
            client.destroy();
        }

        return undefined;

    }


}