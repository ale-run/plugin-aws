
import { DeployedObject, IShell, Logger, SERVICE_STATUS, DeployedWorkload, DeployedWorkloadInstance, DeployedIngress, DeployedDomain, DeploymentStat, MetricItem, MetricData, MetricFilter, DeployedExpose, DeployedVolume, AnyObject } from '@ale-run/runtime';
import { AwsAppController } from '../AwsAppController';
import { Duplex, PassThrough, Readable, Transform, Writable } from 'stream';
import { EC2 } from './EC2';
import { Volume } from './Volume';
import { Client, ClientChannel, ConnectConfig } from 'ssh2';


const logger = Logger.getLogger('app:AwsEC2App');

export default class AwsEC2App extends AwsAppController<EC2> {

  /**
   * AwsAppController.getDirname
   * @returns 
   */
  public getDirname(): string {
    return __dirname;
  }

  /**
   * AwsAppController.readOptions
   * @returns EC2
   */
  public async readOptions(): Promise<EC2> {

    // If the user didn't provide a region value in request.options, use the region value from plugin?.options as a fallback.
    let region = this.request.options.region?.trim() || this.plugin?.options?.REGION;
    // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.
    let vpcId = this.request.options.vpcId?.trim() || this.plugin?.options?.VPC_ID;

    // Underscores ('_') are not allowed in Terraform
    let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
    let subnetId = this.request.options.subnetId;
    // let subnetTier = this.request.options.subnetTier.trim();
    // let subnetZone = this.request.options.subnetZone.trim();
    const associatePublicIpAddress = this.request.options.associatePublicIpAddress;
    const instanceType = this.request.options.instanceType.trim();
    const volumeSize = this.request.options.volumeSize;

    const prevOptions = await this.store.loadObject('option');
    // This setting is fixed and cannot be updated.
    if (prevOptions) {
      region = prevOptions?.region;
      vpcId = prevOptions?.vpcId;
      identifier = prevOptions?.identifier;
      subnetId = prevOptions?.subnetId;
      // subnetTier = prevOptions?.subnetTier;
      // subnetZone = prevOptions?.subnetZone;
    }

    if (!region) throw new Error(`options 'Region' is required`);
    if (!vpcId) throw new Error(`options 'VPC ID' is required`);
    if (!subnetId) throw new Error(`options 'Subnet ID' is required`);
    // if (!subnetTier) throw new Error(`options 'Tier(public/private)' is required`);
    // if (!subnetZone) throw new Error(`options 'Zone(a/b/c)' is required`);
    

    const options = {
      region,
      vpcId,
      identifier,
      subnetId,
      associatePublicIpAddress,
      instanceType,
      volumeSize,
      instanceState: SERVICE_STATUS.running,
    } as EC2;

    await this.store.save('option', options);

    return options;

  }

  /**
   * AwsAppController.saveOutput
   * @param stream 
   * @param shell 
   * @param options 
   */
  public async saveOutput(stream: Duplex, shell: IShell, options?: EC2): Promise<void> {

    // save pem
    await this.savePem(shell);

    // output 
    const instanceId = await this.getOutput(stream, shell, 'instance_id');
    const instanceState = await this.getOutput(stream, shell, 'instance_state');
    const instanceType = await this.getOutput(stream, shell, 'instance_type');
    const privateDns = await this.getOutput(stream, shell, 'private_dns');
    const privateIp = await this.getOutput(stream, shell, 'private_ip');
    const launchTime = await this.getOutput(stream, shell, 'launch_time');
    const publicDns = await this.getOutput(stream, shell, 'public_dns');
    const publicIp = await this.getOutput(stream, shell, 'public_ip');
    const rootBlockDevice = await this.getOutput(stream, shell, 'root_block_device');
    // save info
    await this.store.save('info',
      {
        instanceId,
        instanceState,
        deployed: (instanceState === 'running') ? true : false,
        instanceType,
        privateDns,
        privateIp,
        launchTime,
        publicDns,
        publicIp,
        rootBlockDevice
      }
    );
  }

  // save pem 
  // TODO only admin
  private async savePem(shell: IShell) {
    const pem = await shell.readFile('key.pem');
    if (pem) {
      await this.store.save('pem', pem);
    }
  }

  /**
   * AppController.stop
   * terraform apply 
   */
  public async stop(): Promise<void> {

    logger.info(`[STOP]`, this.request);

    const options: EC2 = await this.readOptions();
    options.instanceState = SERVICE_STATUS.stopped
    await this.runApply(options)

    logger.info(`[STOP]Done`, this.request);
  }


  /**
   * SSH connect config
   * @returns 
   */
  private async getConnectConfig(): Promise<ConnectConfig> {

    const info = await this.store.loadObject('info');
    const pem = await this.store.load('pem');

    const config: ConnectConfig = {
      host: info?.publicDns || info?.privateDns,
      port: 22,
      username: 'ubuntu',
      // privateKey: fs.readFileSync('/path/to/your/private/key')
      privateKey: pem,
      readyTimeout: 10000 
    };

    return config;
  }


  /**
   * AppController.attach
   * Termianl
   * @param id 
   * @param options 
   * @returns 
   */
  public async attach(id: string, options?: AnyObject):
    Promise<{
      stdin: Writable;
      stdout: Readable;
      stderr: Readable;
    }> {

    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();

    function cleanInput(input: string): string {
      // ANSI escape 시퀀스 remove (예: "\x1b[31m", "\x1b[0K" 등)
      let cleaned = input.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
      // backspace(\x08) remove
      cleaned = cleaned.replace(/\x08/g, '');
      // Carriage Return(\r) remove
      cleaned = cleaned.replace(/\r/g, '');
      return cleaned;
    }

    const config = await this.getConnectConfig();
    const client = new Client();
    client.connect(config);
    client.on('ready', () => {
      logger.info('[TERMINAL]Connect');

      client.shell((err, stream) => {
        if (err) throw err;

        // filtering & setWindow
        const filterStream = new Transform({
          transform(chunk, encoding, callback) {
            const data = chunk.toString();

            if (data.includes('{') && data.includes('}')) {
              this.push('');
              const windowSize = JSON.parse(data);
              stream.setWindow(windowSize.r, windowSize.c, 1000, windowSize.c);

            } else {
              if (+chunk === 0) {
                this.push(data)
              } else {
                this.push(cleanInput(data))
              }
            }
            callback();
          }
        });

        stream.on('data', (data: Buffer) => {
          logger.debug(data.toString());
        });

        stdin.pipe(filterStream).pipe(stream); // user input to the SSH stream
        stream.pipe(stdout); // SSH stream output to the terminal

        stream.on('close', () => {
          logger.info('[TERMINAL]Close');
          stdin.unpipe(stream);
          client.end();
        });
      });
    });

    client.on('error', (error) => {
      logger.error(`[TERMINAL]Error`, error)
      stderr.write(error.message);
      client.end();
    });

    client.on('timeout', () => {
      logger.error('[TERMINAL]timeout')
      stderr.write('connection timeout');
      client.end();
    });

    return {
      stdin,
      stdout,
      stderr
    };
  }


  /**
   * AppController.list 
   * @param type 
   * @returns 
   */
  public async list(kind?: string): Promise<DeployedObject[]> {

    const deployedObjects: DeployedObject[] = []

    const info = await this.store.loadObject('info');
    if (info === undefined || info === null) return;
    const options = await this.store.loadObject('option');

    logger.info(`[LIST]`, this.request);
    logger.info(`[LIST][info]`, info);

    // workload
    const workload = {
      kind: 'workload',
      name: options.identifier,
      displayName: options.identifier,
      replicas: info?.deployed ? 1 : 0, 
      ready: info?.deployed ? 1 : 0,
      instances: [
        {
          id: info?.instanceId,
          status: info?.instanceState,
          started: new Date(info?.start),
          ip: info?.privateDns
        }
      ]
    } as DeployedWorkload;
    deployedObjects.push(workload);

    // publicIP
    if (info?.publicDns) {
      const ingress = {
        kind: 'ingress',
        name: 'public',
        type: 'tcp',
        entrypoints: [info?.publicDns],
        servicePort: 22,
        status: 'bound',
        // description: 'description'
      } as DeployedIngress;
      deployedObjects.push(ingress);
    }

    // privateIP
    const expose = {
      kind: 'expose',
      name: 'private',
      hostname: info?.privateDns,
      port: 22,
      protocol: 'tcp',
      // description: 'description'
    } as DeployedExpose;
    deployedObjects.push(expose);

    // volume
    if (info?.rootBlockDevice) {
      const volumes: Volume[] = JSON.parse(info?.rootBlockDevice);

      // delete_on_termination: true
      // device_name: /dev/sda1
      // encrypted: false
      // iops: 150
      // kms_key_id: ""
      // tags: null
      // tags_all:
      //   Created: ale
      //   Environment: dev
      //   Name: dev-aws-ec2-main-aws-ec2-282
      // throughput: 0
      // volume_id: vol-0245154e6032c1455
      // volume_size: 50
      // volume_type: gp2

      for (const volume of volumes) {
        const v = {
          kind: 'volume',
          name: volume.volume_id,
          // displayName: volume.device_name,
          size: volume.volume_size,
          mode: 'rwx', 
          status: 'bound', 
          description: volume 
        } as DeployedVolume
        deployedObjects.push(v);
      }
    } 

    return deployedObjects;
  }

  /**
   * AppController.getStat
   * @returns 
   */
  public async getStat(): Promise<DeploymentStat> {

    const info = await this.store.loadObject('info');
    if (info === undefined || info === null) return;
    const option = await this.store.loadObject('option');

    const statObject = {
      region: option?.region,
      metric: 'cloudwatch',
      namespace: 'AWS/EC2',
      dimensionName: 'InstanceId',
      dimensionValue: info?.instanceId,
      identifier: option.identifier
    }

    return {
      status: info?.deployed ? SERVICE_STATUS.running : SERVICE_STATUS.stopped,
      cpu: +info?.cpu || 0,
      memory: +info?.cpu || 0,
      disk: +info?.cpu || 0,
      replicas: info?.deployed ? 1 : 0,
      ready: info?.deployed ? 1 : 0,
      available: info?.deployed ? 1 : 0,
      unavailable: 0,
      entrypoints: info?.endpoint
        ?
        [
          {
            link: info.endpoint,
            type: 'tcp'
          }
        ]
        : null,
      exposes: [],
      objects: [statObject],
      since: new Date(info?.launchTime)
    };
  }

  /**
   * AppController.getMetricItems
   * @returns 
   */
  public async getMetricItems(): Promise<MetricItem[]> {

    return [
      {
        name: 'CPUUtilization',
        title: 'CPUUtilization',
        unit: '%'
      },
      {
        name: 'NetworkIn',
        title: 'NetworkIn',
        unit: 'Byte',
        // options: {
        //   mode: 'sum'
        // }
      },
      {
        name: 'NetworkOut',
        title: 'NetworkOut',
        unit: 'Byte',
        // options: {
        //   mode: 'sum'
        // }
      }
    ]
  }

  /** 
   * AppController.getMetric
   * @param name 
   * @param options 
   * @returns 
   */
  public async getMetric(name: string, options: MetricFilter): Promise<MetricData> {

    const metricObject = await this.getStatObject();
    if (metricObject === undefined) return;

    let metricData = null;

    switch (name) {
      case 'CPUUtilization':
        metricData = await this.cloudwatchApi.getCPUUtilization(metricObject, options);
        break;
      case 'NetworkIn':
        metricData = await this.cloudwatchApi.getNetworkIn(metricObject, options);
        break;
      case 'NetworkOut':
        metricData = await this.cloudwatchApi.getNetworkOut(metricObject, options);
        break;
      default:
        logger.warn(`[METRIC][${this.deployment.name}] undefined metric item '${name}'`);
        return;
    }

    logger.info(`[METRIC]`, metricData);

    // total: number;
    // dates: Date[];
    // series?: MetricItemSeries[];
    // values?: number[];
    // summary?: AnyObject[];

    return metricData;
  }


}

