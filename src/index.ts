import { Plugin, Logger } from '@ale-run/runtime';
import path from 'path';

const logger = Logger.getLogger('plugin:aws');

export default class AWSPlugin extends Plugin {
  public async install(): Promise<void> {
    logger.info(`plugin aws is installed`, this.options);
  }

  public async uninstall(): Promise<void> {
    logger.info(`plugin aws is uninstalled`, this.options);
  }

  public async activate(): Promise<void> {
    logger.info(`plugin aws is activated`, this.options);

    // install apps
    const catalog = await this.context.getCatalog();
    await catalog.regist(`${path.resolve(__dirname, 'app/aws-rds')}`);
    await catalog.registPreset(`${path.resolve(__dirname, 'app/aws-rds')}`);

    await catalog.regist(`${path.resolve(__dirname, 'app/aws-lambda')}`);
    await catalog.registPreset(`${path.resolve(__dirname, 'app/aws-lambda')}`);

    await catalog.regist(`${path.resolve(__dirname, 'app/aws-memory-db')}`);
    await catalog.registPreset(`${path.resolve(__dirname, 'app/aws-memory-db')}`);

    await catalog.regist(`${path.resolve(__dirname, 'app/aws-s3')}`);
    await catalog.registPreset(`${path.resolve(__dirname, 'app/aws-s3')}`);

    await catalog.regist(`${path.resolve(__dirname, 'app/aws-ec2')}`);
    await catalog.registPreset(`${path.resolve(__dirname, 'app/aws-ec2')}`);

    await catalog.regist(`${path.resolve(__dirname, 'app/aws-ecs')}`);
    await catalog.registPreset(`${path.resolve(__dirname, 'app/aws-ecs')}`);
  }

  public async deactivate(): Promise<void> {
    logger.info(`plugin aws is deactivated`, this.options);

    const catalog = await this.context.getCatalog();
    await catalog.unregist('aws-rds');
    await catalog.unregistPreset('aws-rds');

    await catalog.unregist('aws-lambda');
    await catalog.unregistPreset('aws-lambda');

    await catalog.unregist('aws-memory-db');
    await catalog.unregistPreset('aws-memory-db');

    await catalog.unregist('aws-s3');
    await catalog.unregistPreset('aws-s3');

    await catalog.unregist('aws-ec2');
    await catalog.unregistPreset('aws-ec2');

    await catalog.unregist('aws-ecs');
    await catalog.unregistPreset('aws-ecs');
  }
}
