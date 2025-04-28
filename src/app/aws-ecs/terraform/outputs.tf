output "ENVIRONMENT" {
  value = var.environment
}

output "REGION" {
  value = var.region
}

output "VPC_ID" {
  value = var.vpc_id
}

output "cluster_id" {
  value = data.aws_ecs_cluster.cluster.id
}

output "task" {
  value = aws_ecs_task_definition.task
}

output "service" {
  value = aws_ecs_service.service
}

output "security_group" {
  value = aws_security_group.security_group
}

output "lb" {
  value = aws_lb.lb
}

output "lb_dns" {
  value = aws_lb.lb.dns_name
}