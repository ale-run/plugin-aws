output "ENVIRONMENT" {
  value = var.environment
}

output "REGION" {
  value = var.region
}

output "bucket_id" {
  value = aws_s3_bucket.s3_bucket.id
}

output "bucket_arn" {
  value = aws_s3_bucket.s3_bucket.arn
}

output "bucket_domain_name" {
  value = aws_s3_bucket.s3_bucket.bucket_domain_name
}
