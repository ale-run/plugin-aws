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

variable "bucket_name" {
  description = "bucket name (only lowercase letters, numbers, dots(.), and hyphens(-). 3(min) and 63(max) characters long)"
  type        = string
  nullable    = false
}

variable "bucket_prefix" {
  description = "bucket name (only lowercase letters, numbers, dots(.), and hyphens(-). 3(min) and 63(max) characters long)"
  type        = string
  nullable    = true
  default     = null
}
