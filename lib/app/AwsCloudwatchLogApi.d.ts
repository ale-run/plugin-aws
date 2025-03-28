import { StartLiveTailCommandOutput } from '@aws-sdk/client-cloudwatch-logs';
import { PassThrough } from 'stream';
export declare class AwsCloudwatchLogApi {
    private readonly CLIENT_TIMEOUT;
    private readonly region;
    private readonly logGroupIdentifier;
    private client;
    private stream;
    private timerId;
    constructor(region: string, logGroupIdentifier: string, stream: PassThrough);
    /**
     * handle response for startLiveTail
     * @param response
     */
    handleResponseAsync(response: StartLiveTailCommandOutput): Promise<void>;
    /**
     * startLiveTail
     * @param logGroupIdentifier
     * @returns
     */
    startLiveTail(): Promise<void>;
    /**
     * Latest Log Stream Name
     * @param logGroupIdentifier
     * @returns
     */
    private getLatestLogStreamName;
    /**
     * called by handleResponseAsync
     * resetTimeout on log received
     */
    private resetTimeout;
    /**
     * close
     */
    private close;
    /**
     * get Logs
     * last 100 rows
     * @param logGroupIdentifier
     * @param startTime
     * @param endTime
     * @param nextToken
     * @param limit
     * @returns
     */
    getLogs(): Promise<void>;
}
