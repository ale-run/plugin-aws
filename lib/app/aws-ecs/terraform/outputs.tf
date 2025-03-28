output "ENVIRONMENT" {
  value = var.environment
}

output "REGION" {
  value = var.region
}

output "VPC_ID" {
  value = var.vpc_id
}

output "public_subnets_ids" {
  value = data.aws_subnets.public_subnets.ids
}

output "private_subnets_ids" {
  value = data.aws_subnets.private_subnets.ids
}

output "cluster_id" {
  value = data.aws_ecs_cluster.cluster.id
}

output "efs_id" {
  value = data.aws_efs_file_system.efs.id
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