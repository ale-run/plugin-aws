output "ENVIRONMENT" {
  value = var.environment
}

output "REGION" {
  value = var.region
}

output "function_name" {
  value = aws_lambda_function.lambda_function.function_name
}

output "runtime" {
  value = aws_lambda_function.lambda_function.runtime
}

output "last_modified" {
  value = aws_lambda_function.lambda_function.last_modified
}

output "log_group_arn" {
  value = aws_cloudwatch_log_group.cloudwatch_log_group.arn
}

output "function_url" {
  value = aws_lambda_function_url.function_url.function_url
}

output "authorization_type" {
  value = aws_lambda_function_url.function_url.authorization_type
}

output "input" {
  value = data.aws_lambda_invocation.lambda_invocation.input
}

output "result" {
  value = jsondecode(data.aws_lambda_invocation.lambda_invocation.result)
}