import { Logger } from '@ale-run/runtime';
import { CloudWatchLogsClient, StartLiveTailCommand, OrderBy, DescribeLogStreamsCommand, StartLiveTailCommandOutput, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { PassThrough } from 'stream';


const logger = Logger.getLogger('app:AwsCloudwatchLogApi');

export class AwsCloudwatchLogApi {

  private readonly CLIENT_TIMEOUT = 5 * 60 * 1000;
  private readonly region: string;
  private readonly logGroupIdentifier: string
  private client: CloudWatchLogsClient;
  private stream: PassThrough;
  private timerId: NodeJS.Timeout;

  constructor(region: string, logGroupIdentifier: string, stream: PassThrough) {
    this.region = region;
    this.logGroupIdentifier = logGroupIdentifier;
    // this.client = this.getClient();

    const config = {
      region: this.region
    }
    this.client = new CloudWatchLogsClient(config)
    logger.info(`[LOG][${new Date().toISOString()}]client connect`)
    this.stream = stream;
  }

  /**
   * handle response for startLiveTail
   * @param response 
   */
  public async handleResponseAsync(response: StartLiveTailCommandOutput) {

    logger.debug('[LOG]handleResponseAsync')

    try {
      for await (const event of response.responseStream) {

        if (event.sessionStart !== undefined) {
          logger.info(`[LOG][${this.logGroupIdentifier}]start live tail session`, event.sessionStart);
        } else if (event.sessionUpdate !== undefined) {
          for (const logEvent of event.sessionUpdate.sessionResults) {
            this.resetTimeout();
            const logDate = new Date(logEvent.timestamp);
            logger.debug(`[${logDate.toISOString()}] ${logEvent.message}`);
            // stream write시 ISO Date 사용시 write 되지 않음, 확인 필요 
            this.stream.write(`[${logDate}] ${logEvent.message}`);
          }
        }

      }
    } catch (err) {
      logger.error(`[LOG][${this.logGroupIdentifier}]handleResponseAsync Error ==`)
      logger.error(err)
    }
  }

  /**
   * startLiveTail 
   * @param logGroupIdentifier 
   * @returns 
   */
  public async startLiveTail() {

    logger.info(`[LOG][${this.logGroupIdentifier}]startLiveTail`)

    const logStreamName = await this.getLatestLogStreamName(this.logGroupIdentifier);
    if (!logStreamName) {
      return;
    }

    const input = {
      logGroupIdentifiers: [this.logGroupIdentifier],
      logStreamNames: [logStreamName],  // 로그 스트림 이름
      // logEventFilterPattern: filterPattern
    };

    try {

      const command = new StartLiveTailCommand(input);
      const response = await this.client.send(command);
      this.resetTimeout();
      this.handleResponseAsync(response);

    } catch (err) {
      logger.error(`[LOG][${this.logGroupIdentifier}]startLiveTail Error ==`)
      logger.error(input)
      logger.error(err)

      this.close();

    }
  }

  /**
   * Latest Log Stream Name
   * @param logGroupIdentifier 
   * @returns 
   */
  private async getLatestLogStreamName(logGroupIdentifier: string): Promise<string> {

    const input = {
      logGroupIdentifier,
      orderBy: OrderBy.LastEventTime,    // LastEventTime or LogStreamName
      descending: true,
      limit: 1
    };

    try {

      const command = new DescribeLogStreamsCommand(input);
      const response = await this.client.send(command);

      if (response.logStreams.length > 0) {
        const latestStream = response.logStreams[0];
        logger.info(`[LOG][${this.logGroupIdentifier}]LatestLogStreamName: ${latestStream.logStreamName} (Last Event: ${new Date(latestStream.lastEventTimestamp).toISOString()})`);
        return latestStream.logStreamName;
      } else {
        throw new Error(`[${logGroupIdentifier}]not found log stream!`);
      }

    } catch (err) {
      logger.error(`[LOG][${this.logGroupIdentifier}]getLatestLogStreamName Error ==`)
      logger.error(input)
      logger.error(err)

      this.close();
    }
  }

  /**
   * called by handleResponseAsync
   * resetTimeout on log received
   */
  private resetTimeout() {

    if (this.timerId) clearTimeout(this.timerId);

    this.timerId = setTimeout(() => {
      logger.info(`[LOG][${this.logGroupIdentifier}]timeout (${new Date().toISOString()})`);
      this.stream.write('timeout');
      this.close();
    }, (this.CLIENT_TIMEOUT));
  }



  /**
   * close
   */
  private close() {
    logger.info(`[LOG][${this.logGroupIdentifier}]stream & client destroy`);
    this.stream.destroy();
    this.client.destroy();
  }

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
  public async getLogs() {

    logger.info(`[LOG][${this.logGroupIdentifier}]getLogs`)

    const logStreamName = await this.getLatestLogStreamName(this.logGroupIdentifier);
    if (!logStreamName) {
      return;
    }

    const input = {
      logGroupIdentifier: this.logGroupIdentifier,
      logStreamName,  // 로그 스트림 이름
      // startTime: startTime,
      // endTime: endTime,
      // nextToken: nextToken,
      limit: 100
    };

    try {
      const command = new GetLogEventsCommand(input);
      const response = await this.client.send(command);

      // 로그 출력
      response.events.forEach(event => {
        logger.debug(`[${new Date(event.timestamp).toISOString()}] ${event.message}`);
        this.stream.write(`[${new Date(event.timestamp)}] ${event.message}`);

      });

    } catch (err) {
      logger.error(`[LOG][${this.logGroupIdentifier}]getLogs Error ==`)
      logger.error(input)
      logger.error(err)

      this.close();

    }


  }

}
