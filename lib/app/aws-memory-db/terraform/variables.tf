variable "environment" {
  description = "Environment"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "Region"
  type        = string
  default     = "ap-northeast-2"
}

variable "vpc_id" {
  description = "vpc id"
  type        = string
  #default     = ""
}

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
}

variable "name" {
  description = "name of the MemoryDB"
  type        = string
}

variable "engine" {
  description = "engine (redis, valkey)"
  type        = string
  default     = "Redis"
}

variable "engine_version" {
  description = "engine version 7.1, 7.0, 6.2"
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "node type of the MemoryDB https://docs.aws.amazon.com/memorydb/latest/devguide/nodes.supportedtypes.html"
  type        = string
  default     = "db.t4g.small"
}

variable "port" {
  description = "The port on which the DB accepts connections"
  type        = number
  default     = 6379
}

variable "num_shards" {
  description = "number of shard"
  type        = number
  default     = 1
}

variable "num_replicas_per_shard" {
  description = "number of replicas per shard"
  type        = number
  default     = 1
}

variable "subnet_group_name" {
  description = "Name of subnet group"
  type        = string
  #default     = ""
}

# variable "parameter_group_name" {
#   description = "Name of parameter group"
#   type        = string
#   default     = ""
# }

variable "acl_name" {
  description = "Name of ACL"
  type        = string
  #default     = ""
}

# variable "username" {
#   description = "Username for the master DB user"
#   type        = string
#   default     = "admin"
# }

# variable "password" {
#   description = "Password for the master DB user"
#   type        = string
#   sensitive   = true
#   default     = "admin"
# }

variable "maintenance_window" {
  description = "Specifies the weekly time range during which maintenance on the cluster is performed. It is specified as a range in the format ddd:hh24:mi-ddd:hh24:mi"
  type        = string
  default     = "Mon:18:00-Mon:20:00"
}

variable "snapshot_retention_limit" {
  description = "The number of days for which MemoryDB retains automatic snapshots before deleting them. When set to 0, automatic backups are disabled"
  type        = number
  default     = 1
}

variable "snapshot_window" {
  description = "The daily time range (in UTC) during which MemoryDB begins taking a daily snapshot of your shard"
  type        = string
  default     = "12:00-14:00"
}