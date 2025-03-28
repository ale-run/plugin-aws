provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Environment = var.environment
      Created     = "ale"
    }
  }
}

resource "aws_s3_bucket" "s3_bucket" {

  #버킷 이름은 3자(최소)에서 63자(최대) 사이여야 합니다.
  #버킷 이름은 소문자, 숫자, 점(.) 및 하이픈(-)으로만 구성될 수 있습니다.
  bucket = var.bucket_name
  #bucket_prefix = "${var.bucket_prefix}-"

  tags = {
    Name = var.bucket_name
  }
}
