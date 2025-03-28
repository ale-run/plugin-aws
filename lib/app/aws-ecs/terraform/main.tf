provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Environment = var.environment
      ECS         = var.task_family_name
      Created     = "ale"
    }
  }
}

# cluster 
data "aws_ecs_cluster" "cluster" {
  cluster_name = var.cluster_name
}

# efs
data "aws_efs_file_system" "efs" {
  tags = {
    Name = var.efs_name
  }
}
# ecs TaskExecutionRole
data "aws_iam_role" "task_role" {
  name = var.task_role_name
}

# public subnet Ids (LB 생성용)
data "aws_subnets" "public_subnets" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Tier = "public"
  }
}

# subnet Ids (FARGATE network 설정용)
data "aws_subnets" "private_subnets" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Tier = "private"
  }
}

locals {
  volume_names = [for each in var.container_volumes : each.name]
}

# efs내 access point 생성
resource "aws_efs_access_point" "access_point" {
  count = length(var.container_volumes)
 
  file_system_id = data.aws_efs_file_system.efs.id

  tags ={
    Name = var.container_volumes[count.index].efs_path
  }

  root_directory {
    path = var.container_volumes[count.index].efs_path
    creation_info {
      owner_gid = var.container_volumes[count.index].gid
      owner_uid = var.container_volumes[count.index].uid
      permissions = 777
    }
  }

  posix_user {
    gid = 0
    uid = 0
  }
}


################################################################################
#
# task_definition
#
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
################################################################################
resource "aws_ecs_task_definition" "task" {
  family                   = var.task_family_name
  requires_compatibilities = ["FARGATE", "EC2"]
  runtime_platform {
    cpu_architecture        = "X86_64"
    operating_system_family = "LINUX"
  }
  //특별한 사유가 없는 한 network_mode = "awsvpc" 사용 권장
  network_mode       = "awsvpc"
  cpu                = var.cpu
  memory             = var.memory
  task_role_arn      = data.aws_iam_role.task_role.arn
  execution_role_arn = data.aws_iam_role.task_role.arn

  container_definitions = jsonencode([
    {
      name  = var.container_name,
      image = var.container_image,
      cpu       = var.cpu
      memory    = var.memory
      essential = true,
      portMappings = [
        {
          name          = "port-${var.container_port}"
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ],
      environment = [
        for env in var.environments : 
        {
          name  = env.name,
          value = env.value
        }
      ],
      mountPoints = [
        for volume in var.container_volumes : 
        {
          sourceVolume  = volume.name,
          containerPath = volume.path,
          readOnly      = false
        }
      ],

      logConfiguration = {
        logDriver = "awslogs",
        options = {
          awslogs-group         = "/ecs/${var.task_family_name}"
          mode                  = "non-blocking"
          awslogs-create-group  = "true"
          max-buffer-size       = "25m"
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        },
        secretOptions = []
      }
      requiresAttributes = [
        {
          name = "com.amazonaws.ecs.capability.logging-driver.awslogs"
        },
        {
          name = "ecs.capability.execution-role-awslogs"
        },
        {
          name = "com.amazonaws.ecs.capability.docker-remote-api.1.19"
        },
        {
          name = "com.amazonaws.ecs.capability.docker-remote-api.1.28"
        },
        {
          name = "com.amazonaws.ecs.capability.task-iam-role"
        },
        {
          name = "com.amazonaws.ecs.capability.docker-remote-api.1.18"
        },
        {
          name = "ecs.capability.task-eni"
        },
        {
          name = "com.amazonaws.ecs.capability.docker-remote-api.1.29"
        }
      ],
    },
  ])

  dynamic "volume" {
    for_each = local.volume_names
    

    content {
      name = volume.value

      efs_volume_configuration {
          file_system_id          = data.aws_efs_file_system.efs.id
          root_directory          = "/"
          transit_encryption      = "ENABLED"
          //transit_encryption_port = 2999

          authorization_config {
              # function index(list, value)
              access_point_id = aws_efs_access_point.access_point[index(local.volume_names, volume.value)].id
              iam = "ENABLED"
          }
      }
    }
  }

  # tags = {
  # }

  # placement_constraints {
  #   type       = "memberOf"
  #   expression = "attribute:ecs.availability-zone in [us-west-2a, us-west-2b]"
  # }

  depends_on = [aws_efs_access_point.access_point] #명시적 의존성
}

## 보안그룹 생성 #####
resource "aws_security_group" "security_group" {
  name        = var.service_name
  description = "for ecs ${var.service_name} (created by ale)"
  vpc_id      = var.vpc_id
}

resource "aws_security_group_rule" "ingress" {
  type              = "ingress"
  from_port         = var.container_port
  to_port           = var.container_port
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.security_group.id
}

resource "aws_security_group_rule" "egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.security_group.id
}

## LB 대상그룹 생성 ####
resource "aws_lb_target_group" "target_group" {
  name            = var.service_name
  port            = var.container_port
  protocol        = "HTTP"
  target_type     = "ip"
  ip_address_type = "ipv4"
  vpc_id          = var.vpc_id

  health_check {
    interval            = 30
    path                = "/"
    healthy_threshold   = 3
    unhealthy_threshold = 3
  }
}

## LB 생성 ####
resource "aws_lb" "lb" {
  name               = "${var.service_name}-lb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.security_group.id]
  subnets            = data.aws_subnets.public_subnets.ids

  #true인 경우 terraform을 통한 삭제 불가
  #enable_deletion_protection = true

  # access_logs {
  #   bucket  = aws_s3_bucket.lb_logs.id
  #   prefix  = "lb-${local.service_name}"
  #   enabled = true
  # }

  depends_on = [aws_security_group.security_group] #명시적 의존성

}

## LB 리스너 추가 (대상그룹))
resource "aws_lb_listener" "lb_listener" {
  load_balancer_arn = aws_lb.lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    target_group_arn = aws_lb_target_group.target_group.arn
    type             = "forward"
  }
}

## 로그 그룹 생성
resource "aws_cloudwatch_log_group" "log" {
  name              = "/ecs/${var.task_family_name}"
  log_group_class   = "STANDARD"
  retention_in_days = 30
}


################################################################################
#
# 서비스 생성
#
################################################################################
resource "aws_ecs_service" "service" {

  cluster = data.aws_ecs_cluster.cluster.arn

  #용량 공급자 전략
  # capacity_provider_strategy {
  #   base              = 0
  #   capacity_provider = "FARGATE"
  #   weight            = 1
  # }

  #시작유형
  #Launch type on which to run your service. (EC2, FARGATE, and EXTERNAL Defaults to EC2)
  launch_type = var.launch_type

  ### 배포 구성 ##############  
  #Family and revision (family:revision) or full ARN of the task definition
  task_definition = aws_ecs_task_definition.task.arn
  #task_definition     = "arn:aws:ecs:ap-northeast-2:139812996724:task-definition/task-httpd-new:1"
  name = var.service_name
  #Scheduling strategy to use for the service. (REPLICA, DAEMON. Defulats to REPLICA)
  #Note that Tasks using the Fargate launch type or the CODE_DEPLOY or EXTERNAL deployment controller types don't support the DAEMON scheduling strategy.
  scheduling_strategy = "REPLICA"
  desired_count       = var.desired_count

  #enable Amazon ECS Exec for the tasks within the service.
  enable_execute_command = true
  #Enable to delete a service even if it wasn't scaled down to zero tasks. (only REPLICA scheduling strategy)
  force_delete = true
  force_new_deployment = true
  triggers = {
    redeployment = plantimestamp()
  }

  //iam_role        = aws_iam_role.foo.arn
  //depends_on      = [aws_iam_role_policy.foo]

  #배포 옵션
  #Type of deployment controller.(CODE_DEPLOY, ECS, EXTERNAL)
  #ECS:롤링업데이트, CODE_DEPLOY:Blue/Green 
  deployment_controller {
    type = "ECS"
  }
  deployment_minimum_healthy_percent = 50

  #배포 실패 감지
  # deployment_circuit_breaker {
  #   enable = true
  #   rollback = true
  # }

  # 네트워킹
  network_configuration {
    subnets          = data.aws_subnets.private_subnets.ids
    security_groups  = [aws_security_group.security_group.id]
    assign_public_ip = false
  }

  # 로그 밸런싱
  load_balancer {
    target_group_arn = aws_lb_target_group.target_group.arn
    container_name   = var.container_name
    container_port = var.container_port
  }

  # FARGATE 는 placement_constraints 사용 못함
  # placement_constraints {
  #   type       = "memberOf"
  #   expression = "attribute:ecs.availability-zone in [ap-northeast-2a]"
  # }

  depends_on = [aws_security_group.security_group] #명시적 의존성
}
