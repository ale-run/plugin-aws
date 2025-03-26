import { Logger } from '@ale-run/runtime';
import { DBInstance, DescribeDBInstancesCommand, RDSClient, StartDBInstanceCommand, StopDBInstanceCommand } from '@aws-sdk/client-rds'; // ES Modules import

const logger = Logger.getLogger('app:AwsRDSApi');

export class AwsRDSApi {

  private getClient(region: string): RDSClient {
    const config = {
      region
    }
    const client = new RDSClient(config)
    return client;

  }

  /**
   * stop RDS
   * @param region 
   * @param identifier 
   * @returns 
   */
  public async stop(region: string, identifier: string): Promise<string | undefined> {

    logger.debug(`[${identifier}]stop`);

    // check status
    const dbInstances = await this.describe(region, identifier);
    if (dbInstances.DBInstanceStatus === 'stopped') return;
    if (dbInstances.DBInstanceStatus !== 'available') throw new Error(`current status is ${dbInstances.DBInstanceStatus}`)

    const client = this.getClient(region);

    const input = { // StopDBInstanceMessage
      DBInstanceIdentifier: identifier,
      // DBSnapshotIdentifier: "STRING_VALUE",
    };

    try {

      const command = new StopDBInstanceCommand(input);
      const response = await client.send(command);
      let status = response.DBInstance.DBInstanceStatus;
      logger.info(`[${identifier}]current status=${status}`);

      // Waiting until the status is 'stopped'
      status = await this.waiting(region, identifier, 'stopped');
      return status;

    } catch (err) {
      logger.error('stop Error ===============================================')
      logger.error(input)
      logger.error(err)

    } finally {
      client.destroy();
    }

  }

  /**
   * start RDS
   * @param region 
   * @param identifier 
   * @returns 
   */
  public async start(region: string, identifier: string): Promise<string | undefined> {

    logger.debug(`[${identifier}]start`);

    // check status
    const dbInstances = await this.describe(region, identifier);
    if (dbInstances.DBInstanceStatus === 'available') return;
    if (dbInstances.DBInstanceStatus !== 'stopped') throw new Error(`current status is ${dbInstances.DBInstanceStatus}`)

    const client = this.getClient(region);

    const input = {
      DBInstanceIdentifier: identifier,
    };

    try {

      const command = new StartDBInstanceCommand(input);
      const response = await client.send(command);
      let status = response.DBInstance.DBInstanceStatus;
      logger.info(`[${identifier}]current status=${status}`);

      // Waiting until the status is 'available'
      status = await this.waiting(region, identifier, 'available');
      return status;

    } catch (err) {
      logger.error('start Error ===============================================')
      logger.error(input)
      logger.error(err)

    } finally {
      client.destroy();
    }

  }

  /**
   * describe RDS
   * @param region 
   * @param identifier 
   * @returns 
   */
  public async describe(region: string, identifier: string): Promise<DBInstance | undefined> {

    logger.debug(`[${identifier}]describe`);
    const client = this.getClient(region);

    const input = {
      DBInstanceIdentifier: identifier,
    };

    try {

      const command = new DescribeDBInstancesCommand(input);
      const response = await client.send(command);

      if (response.$metadata.httpStatusCode === 200) {
        return response.DBInstances[0];
      }

    } catch (err) {
      logger.error('start Error ===============================================')
      logger.error(input)
      logger.error(err)

    } finally {
      client.destroy();
    }

    return undefined;

  }

  /**
   * Waiting until the status is 'targetStatus'
   * @param region 
   * @param identifier 
   * @param targetStatus 
   * @returns 
   */
  async waiting(region: string, identifier: string, targetStatus: string): Promise<string | undefined> {
    // waiting
    let dbInstance = undefined;
    for (let i = 0; i < 60; i++) {
      await this.sleep(10000)
      dbInstance = await this.describe(region, identifier);
      if (dbInstance.DBInstanceStatus === targetStatus) break;
    }
    return dbInstance.DBInstanceStatus;
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


}