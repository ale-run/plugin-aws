data "aws_vpc" "vpc" {
  id = var.vpc_id
}

# db_subnet_group 목록을 가져오는 방법을 찾을 수 없음
data "aws_db_subnet_group" "db_subnet_group" {
  name   = var.db_subnet_group_name
  #vpc_id = var.vpc_id
}

locals {

  vpc_cidr_block       = data.aws_vpc.vpc.cidr_block    
  db_subnet_ids       = data.aws_db_subnet_group.db_subnet_group.subnet_ids
  //db_subnet_group_name = data.aws_db_subnet_group.db_subnet_group.name
  
  #engine               = "mysql"
  version              = split(".", var.engine_version)
  major_engine_version = "${local.version[0]}.${local.version[1]}"
  family               = "${var.engine}${local.major_engine_version}"
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Environment = var.environment
      Created     = "ale"
    }
  }
}

################################################################################
# RDS Module
################################################################################
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.9.0"

  #The name of the RDS instance
  identifier = var.identifier

  engine = var.engine

  engine_version = var.engine_version
  # The family of the DB parameter group
  # mariadb10.11, mariadb10.6, mariadb10.5
  family               = local.family
  major_engine_version = local.major_engine_version

  instance_class = var.instance_class

  #Strogae
  # 'standard' (magnetic), 
  # 'gp2' (general purpose SSD), 
  # 'gp3' (new generation of general purpose SSD), or 'io1' (provisioned IOPS SSD). 
  # The default is 'io1' 
  storage_type = var.storage_type
  # Setting this implies a storage_type of 'io1' or `gp3`.
  iops                  = var.iops
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage

  db_name  = "test"
  username = var.username
  # Set to true to allow RDS to manage the master user password in Secrets Manager (Default: true)
  manage_master_user_password = false
  password                    = var.password
  port                        = var.port

  # Specifies if the RDS instance is multi-AZ
  # Creates a standby in a different Availability Zone
  multi_az               = false
  subnet_ids             = local.db_subnet_ids
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [module.security_group.security_group_id]

  # The window to perform maintenance in.
  maintenance_window = var.maintenance_window
  # The daily time range (in UTC) during which automated backups are created if they are enabled. 
  backup_window = var.backup_window
  # List of log types to enable for exporting to CloudWatch logs.
  # If omitted, no logs will be exported. 
  # alert, audit, error, general, listener, slowquery, trace, postgresql (PostgreSQL), upgrade (PostgreSQL)
  enabled_cloudwatch_logs_exports = ["general"]
  create_cloudwatch_log_group     = true

  skip_final_snapshot = true
  # deletion_protection = false

  # performance_insights_enabled          = true
  # performance_insights_retention_period = 7
  # create_monitoring_role                = true
  # monitoring_interval                   = 60

  # A list of DB parameters (map) to apply
  # utf8mb4 최신버전 Default, 문자당 4바이트가 필요한 고정 길이 인코딩을 사용
  parameters = [
    {
      name  = "character_set_client"
      value = "utf8mb4"
    },
    {
      name  = "character_set_server"
      value = "utf8mb4"
    }
  ]

}


module "security_group" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.2"

  name   = var.identifier
  vpc_id = var.vpc_id

  # ingress
  ingress_with_cidr_blocks = [
    {
      from_port   = var.port
      to_port     = var.port
      protocol    = "tcp"
      description = "access from within VPC"
      cidr_blocks = local.vpc_cidr_block
    },
  ]
}

# resource "aws_rds_instance_state" "state" {
#   identifier = var.identifier
#   # Valid values are available and stopped.
#   state      = var.state
#   depends_on = [module.db]
# }
