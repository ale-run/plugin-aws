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
  description = "Cluster name"
  value       = module.memory-db.cluster_id
}

output "cluster_arn" {
  description = "The ARN of the cluster"
  value       = module.memory-db.cluster_arn
}

output "cluster_endpoint_address" {
  description = "DNS hostname of the cluster configuration endpoint"
  value       = module.memory-db.cluster_endpoint_address
}

output "cluster_endpoint_port" {
  description = "Port number that the cluster configuration endpoint is listening on"
  value       = module.memory-db.cluster_endpoint_port
}

output "cluster_engine_patch_version" {
  description = "Patch version number of the Redis engine used by the cluster"
  value       = module.memory-db.cluster_engine_patch_version
}

output "cluster_shards" {
  description = "Set of shards in this cluster"
  value       = module.memory-db.cluster_shards
}
