
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
    let region = this.request.options.region.trim() || this.plugin?.options?.REGION;
    // If the user didn't provide a vpcId value in request.options, use the vpcId value from plugin?.options as a fallback.
    let vpcId = this.request.options.vpcId.trim() || this.plugin?.options?.VPC_ID;

    // Underscores ('_') are not allowed in Terraform
    let identifier = this.session.refs.scopename + '-' + this.session.refs.projectname + '-' + this.session.refs.stagename + '-' + this.session.refs.deploymentname;
    const instanceType = this.request.options.instanceType.trim();
    let subnetTier = this.request.options.subnetTier.trim();
    let subnetZone = this.request.options.subnetZone.trim();
    const volumeSize = this.request.options.volumeSize;
    const env = this.resolveEnv(this.request.options?.env);

    const prevOptions = await this.store.loadObject('option');
    // This setting is fixed and cannot be updated.
    if (prevOptions) {
      region = prevOptions?.region;
      vpcId = prevOptions?.vpcId;
      identifier = prevOptions?.identifier;
      subnetTier = prevOptions?.subnetTier;
      subnetZone = prevOptions?.subnetZone;
    }

    if (!region) throw new Error(`options 'Region' is required`);
    if (!vpcId) throw new Error(`options 'VPC ID' is required`);
    if (!instanceType) throw new Error(`options 'Instance Type' is required`);
    if (!subnetTier) throw new Error(`options 'Tier(public/private)' is required`);
    if (!subnetZone) throw new Error(`options 'Zone(a/b/c)' is required`);

    const options = {
      region,
      vpcId,
      identifier,
      instanceType,
      subnetTier,
      subnetZone,
      volumeSize,
      instanceState: SERVICE_STATUS.running,
      env
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
    const instance_id = await this.getOutput(stream, shell, 'instance_id');
    const instance_state = await this.getOutput(stream, shell, 'instance_state');
    const instance_type = await this.getOutput(stream, shell, 'instance_type');
    const private_dns = await this.getOutput(stream, shell, 'private_dns');
    const private_ip = await this.getOutput(stream, shell, 'private_ip');
    const launch_time = await this.getOutput(stream, shell, 'launch_time');
    const public_dns = await this.getOutput(stream, shell, 'public_dns');
    const public_ip = await this.getOutput(stream, shell, 'public_ip');
    const rootBlockDevice = await this.getOutput(stream, shell, 'root_block_device');
    // save info
    await this.store.save('info',
      {
        instance_id,
        instance_state,
        deployed: (instance_state === 'running') ? true : false,
        instance_type,
        private_dns,
        private_ip,
        launch_time,
        public_dns,
        public_ip,
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
    console.log(info.public_dns)

    const config: ConnectConfig = {
      host: info?.public_dns,
      port: 22,
      username: 'ubuntu',
      // privateKey: fs.readFileSync('/path/to/your/private/key')
      privateKey: pem
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
          id: info?.instance_id,
          status: info?.instance_state,
          started: new Date(info?.start),
          ip: info?.private_dns
        }
      ]
    } as DeployedWorkload;
    deployedObjects.push(workload);

    // privateIP 1
    const expose = {
      kind: 'expose',
      name: 'private',
      hostname: info?.private_dns,
      port: 22,
      protocol: 'tcp',
      description: 'description'
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
      dimensionValue: info?.instance_id,
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
      since: new Date(info?.launch_time)
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

}

