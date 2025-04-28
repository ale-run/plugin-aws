region              = "${region}"
vpc_id              = "${vpcId}"
subnet_ids          = ${JSON.stringify(subnetIds)}
public_subnet_ids   = ${JSON.stringify(publicSubnetIds)}

cluster_name        = "${clusterName}"
task_role_name      = "${taskRoleName}"

task_family_name    = "${identifier}"
container_name      = "${containerName}"
container_image     = "${containerImage}"
container_port      = "${containerPort}"
container_volumes   = ${JSON.stringify(containerVolumes)}
efs_name            = "${efsName}"
service_name        = "${serviceName}"
launch_type         = "${launchType}"

desired_count       = ${desiredCount}
environments        = ${JSON.stringify(environments)}
