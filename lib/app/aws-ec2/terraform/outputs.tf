output "ENVIRONMENT" {
  value = var.environment
}

output "REGION" {
  value = var.region
}

output "VPC_ID" {
  value = var.vpc_id
}

# output "PRIVATE_KEY_PEM" {
#   value = tls_private_key.private_key.private_key_pem
# }

output "key_pair_id" {
  value = aws_key_pair.key_pair.id
}

output "security_group_id" {
  value = aws_security_group.security_group.id
}

output "instance_id" {
  value = aws_instance.instance.id
}

output "instance_type" {
  value = aws_instance.instance.instance_type
}

output "availability_zone" {
  value = aws_instance.instance.availability_zone
}

output "private_dns" {
  value = aws_instance.instance.private_dns
}

output "private_ip" {
  value = aws_instance.instance.private_ip
}

output "public_dns" {
  value = aws_instance.instance.public_dns
}

output "public_ip" {
  value = aws_instance.instance.public_ip
}

output "root_block_device" {
  value = aws_instance.instance.root_block_device
}

output "launch_time" {
  value = data.aws_instance.ec2.launch_time
}

