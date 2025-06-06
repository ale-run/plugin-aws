terraform {
  required_version = ">= 1.9"

 	backend "local" {
		path =".state/terraform.tfstate"
	}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }

}