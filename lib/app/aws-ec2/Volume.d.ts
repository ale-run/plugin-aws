export declare class Volume {
    delete_on_termination: boolean;
    device_name: string;
    encrypted: boolean;
    iops: number;
    kms_key_id: string;
    tags: Map<string, string>;
    tags_all: Map<string, string>;
    throughput: number;
    volume_id: string;
    volume_size: number;
    volume_type: string;
}
