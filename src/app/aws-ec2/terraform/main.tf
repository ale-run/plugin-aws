provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Name        = var.name
      Environment = var.environment
      Created     = "ale"
    }
  }  
}

# data "aws_ami" "ubuntu" {
#   most_recent = true

#   filter {
#     name   = "name"
#     values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
#   }

#   filter {
#     name   = "virtualization-type"
#     values = ["hvm"]
#   }

#   owners = ["099720109477"] # Canonical
# }

#키페어 생성
resource "tls_private_key" "private_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "key_pair" {
  key_name   = var.name
  public_key = tls_private_key.private_key.public_key_openssh
}

resource "local_file" "cicd_downloads_key" {
  filename = "key.pem"
  content  = tls_private_key.private_key.private_key_pem
}

#보안그룹 생성
resource "aws_security_group" "security_group" {
  name = var.name
  description = "created by ale"
  vpc_id = var.vpc_id
}

resource "aws_security_group_rule" "ingress_ssh" {
  type        = "ingress"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = aws_security_group.security_group.id
}

# resource "aws_security_group_rule" "ingress_https" {
#   type        = "ingress"
#   from_port   = 443
#   to_port     = 443
#   protocol    = "tcp"
#   cidr_blocks = ["0.0.0.0/0"]
#   security_group_id = aws_security_group.security_group.id
# }

resource "aws_security_group_rule" "egress_all" {
  type             = "egress"
  from_port        = 0
  to_port          = 0
  protocol         = "-1"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = aws_security_group.security_group.id
}

#EC2  
resource "aws_instance" "instance" {
  ami           = var.ami_id
  instance_type = var.instance_type

  #key pair
  key_name = aws_key_pair.key_pair.key_name    
  
  #subnetId
  subnet_id = var.subnet_id
  
  #sg
  vpc_security_group_ids = [aws_security_group.security_group.id]

  #storage
  root_block_device {
   volume_size = var.volume_size
   volume_type = "gp2"
  }

  #publicIP 
  associate_public_ip_address = false
  # Ignore public IP changes
  lifecycle {
    ignore_changes = [associate_public_ip_address, public_ip, public_dns]
  }

  # tags = {
  #   Name = var.name
  # }
}

resource "aws_eip" "public_ip" {
  count = var.associate_public_ip_address ? 1 : 0
  instance = aws_instance.instance.id
  domain   = "vpc"
}

#EC2 
data "aws_instance" "ec2" {
  instance_id = aws_instance.instance.id
}