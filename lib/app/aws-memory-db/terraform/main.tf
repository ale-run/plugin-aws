data "aws_vpc" "vpc" {
  id = var.vpc_id
}

# [중요]VPC내 database subnet이 존재해야한다
data "aws_subnets" "database" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Tier = "database"
  }
}

locals {

  db_subnet_ids = data.aws_subnets.database.ids

  version              = split(".", var.engine_version)
  parameter_group_name = "default.memorydb-redis${local.version[0]}"
  //parameter_group_family = "memorydb_redis${local.version[0]}"
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Environment = var.environment
      Created     = "ale"
      Cluster     = var.name
    }
  }
}

################################################################################
# MemroyDB Module
################################################################################

module "memory-db" {
  source  = "terraform-aws-modules/memory-db/aws"
  version = "2.0.0"

  # Cluster
  name        = var.name
  description = var.name

  engine_version             = var.engine_version #choose
  auto_minor_version_upgrade = true
  node_type                  = var.node_type              #choose
  num_shards                 = var.num_shards             #default variable
  num_replicas_per_shard     = var.num_replicas_per_shard #default variable
  #전송 중 암호화 
  tls_enabled = true #default

  # Subnet group
  create_subnet_group      = true #default:true
  subnet_group_name        = var.subnet_group_name
  subnet_group_description = var.subnet_group_name
  subnet_ids               = local.db_subnet_ids
  # subnet_group_tags = {
  # }

  # Parameter group
  create_parameter_group = false #default:true
  parameter_group_name   = local.parameter_group_name
  #parameter_group_description = var.parameter_group_name
  #parameter_group_family      = local.parameter_group_family
  # parameter_group_parameters = [
  #   {
  #     name  = "activedefrag"
  #     value = "yes"
  #   }
  # ]
  # parameter_group_tags = {
  # }


  #Set of VPC Security Group ID-s to associate with this cluster
  #security_group_ids       = ["sg-12345678"]


  # Users
  # [중요]사용자는 DB별이 아닌 전체 DB에 대한 Unique!!!!!
  # create_users = true #default
  # users = {
  #   admin = {
  #     user_name     = "admin-user"
  #     access_string = "on ~* &* +@all"
  #     passwords     = ["YouShouldPickAStrongSecurePassword987!"]
  #     tags          = { User = "admin" }
  #   }
  #   readonly = {
  #     user_name     = "readonly-user"
  #     access_string = "on ~* &* -@all +@read"
  #     passwords     = ["YouShouldPickAStrongSecurePassword123!"]
  #     tags          = { User = "readonly" }
  #   }
  # }

  # ACL
  create_acl = true #default:true
  acl_name   = var.acl_name
  # acl_tags   = { 
  # }


  #Specifies the weekly time range during which maintenance on the cluster is performed. It is specified as a range in the format
  maintenance_window = var.maintenance_window
  #스냅샵 보존 기간, 0이면 자동 백업 비활성화 (Default:0)  
  snapshot_retention_limit = var.snapshot_retention_limit
  #스냅샵 작업시간
  snapshot_window = var.snapshot_window

}
