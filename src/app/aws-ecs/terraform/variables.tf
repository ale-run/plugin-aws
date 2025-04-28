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

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "cluster_name" {
  description = "Name of clister"
  type        = string
}

variable "efs_name" {
  description = "Name of efs volume"
  type        = string
}

variable "task_role_name" {
  description = "Name of ecsTaskExecutionRole "
  type        = string
  default     = "ecsTaskExecutionRole"
}

variable "task_family_name" {
  description = "Name of Task definition"
  type        = string
}

variable "container_name" {
  description = "container name"
  type        = string
}

variable "container_image" {
  description = "container_image"
  type        = string
}

variable "cpu" {
  description = "cpu used by the task"
  type        = number
  default     = 256
}

variable "memory" {
  description = "momory used by the task"
  type        = number
  default     = 512
}

variable "container_port" {
  description = "port"
  type        = number
  default     = 80
}

variable "container_volumes" {
  description = "container path"
  type = list(object({
    name      = string //사용자지정이름
    path      = string //containerPath
    efs_path  = string
    gid       = number
    uid       = number
  }))
  default = null
}

variable "service_name" {
  description = "Name of service"
  type        = string
}

variable "launch_type" {
  description = "launch type (EC2, FARGATE)"
  type        = string
  default     = "FARGATE"
}

variable "desired_count" {
  description = "desired_count"
  type        = number
  default     = 1
}

variable "environments" {
  description = "environments"
  type        = list(object({
    name      = string 
    value     = string
  }))
  default     = null
}