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
}

variable "name" {
  description = "name of the ec2"
  type        = string
  nullable    = false
}

variable "ami_id" {
  description = "amazon machine image"
  type        = string
}

variable "instance_type" {
  description = "instance type of the ec2"
  type        = string
}

variable "subnet_id" {
  description = "subnet id"
  type        = string
}

variable "associate_public_ip_address" {
  description = "associate_public_ip_address"
  type        = bool
  default     = false
}

# variable "subnet_tier" {
#   description = "subnet tier (public/private)"
#   type        = string
#   default     = "private"
# }

# variable "subnet_zone" {
#   description = "subnet zone (a/b/c...)"
#   type        = string
#   default     = "a"
# }

variable "volume_size" {
  description = "volume size(gb)"
  type        = number
  default     = 8
}

# variable "instance_state" {
#   description = "running / stopped"
#   type        = string
#   default     = "running"
# }
