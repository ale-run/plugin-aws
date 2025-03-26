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

variable "function_name" {
  description = "function name"
  type        = string
}

variable "runtime" {
  description = "#https://docs.aws.amazon.com/ko_kr/lambda/latest/api/API_CreateFunction.html#SSS-CreateFunction-request-Runtime"
  type        = string
}

variable "source_dir" {
  description = "source_dir"
  type        = string
  default     = "./source"
}

variable "output_path" {
  description = "output_path"
  type        = string
  default     = "source.zip"
}

variable "input" {
  description = "input"
  type        = map
}

