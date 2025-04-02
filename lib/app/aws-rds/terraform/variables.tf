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

variable "subnet_group_name" {
  description = "database subnet group name"
  type        = string
  #default     = ""
}

variable "identifier" {
  description = "name of the RDS"
  type        = string
}

variable "engine" {
  description = "engine (mysql, mariadb)"
  type        = string
  default     = "mysql"
}

variable "engine_version" {
  description = "engine version https://docs.aws.amazon.com/ko_kr/AmazonRDS/latest/UserGuide/MariaDB.Concepts.VersionMgmt.html"
  type        = string
  default     = "8.0.39"
}

variable "instance_class" {
  description = "instance type of the RDS"
  type        = string
  default     = "db.t3.micro"
}

variable "storage_type" {
  description = "standard, gp2, gp3, io1"
  type        = string
  default     = "gp2"
}

variable "iops" {
  description = "storage_type of 'io1' or `gp3`"
  type        = number
  default     = 0
}

variable "allocated_storage" {
  description = "standard(min 5), gp2(min 20), gp3(min 20), io1(min 100)"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "standard(min 5), gp2(min 20), gp3(min 20), io1(min 100)"
  type        = number
  default     = 100
}

# variable "db_name" {
#   description = "standard(min 5), gp2(min 20), gp3(min 20), io1(min 100)"
#   type        = string
# }

variable "username" {
  description = "Username for the master DB user"
  type        = string
}

variable "password" {
  description = "Password for the master DB user"
  type        = string
  sensitive   = true
}

variable "state" {
  description = "Valid values are available and stopped."
  type        = string
  default     = "stopped"
}

variable "port" {
  description = "The port on which the DB accepts connections"
  type        = number
  default     = 3306
}

variable "maintenance_window" {
  description = "The window to perform maintenance in. Syntax: 'ddd:hh24:mi-ddd:hh24:mi'. Eg: 'Mon:00:00-Mon:03:00'"
  type        = string
  default     = "Mon:18:00-Mon:20:00"
}

variable "backup_window" {
  description = "The daily time range (in UTC) during which automated backups are created if they are enabled"
  type        = string
  default     = "16:00-18:00"
}


