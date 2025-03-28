provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Created     = "ale"
    }
  }
}

# resource "random_string" "alphabet" {
#   length = 8
#   upper  = false
#   special = false
# }

# locals {
#   테스트시 funtion_name 중복 방지를 위해 사용함
#   function_name = "${var.function_name}_${random_string.alphabet.result}"
# }

//>>>Lambda Role  ///////////////////////////////////////////////////
data "aws_iam_policy_document" "iam_policy_doc_lambda" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "iam_role_lambda" {
  name               = var.function_name
  assume_role_policy = data.aws_iam_policy_document.iam_policy_doc_lambda.json
}
//<<<Lambda Role  ///////////////////////////////////////////////////

//>>>CloudWatch 로그  /////////////////////////////////////////////////

data "aws_iam_policy_document" "iam_policy_doc_logging" {
  statement {
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DeleteLogGroup",
      "logs:DeleteLogStream",
    ]

    resources = ["arn:aws:logs:*:*:*"]
    //resources = ["arn:aws:logs:*:*:/aws/lambda/${var.function_name}"]
    //"arn:aws:logs:${region}:${account}:log-group:/aws/lambda/${function}"
  }
}

resource "aws_iam_policy" "iam_policy_logging" {
  name        = "${var.function_name}_logging"
  path        = "/"
  description = "IAM policy for logging from a lambda"
  policy      = data.aws_iam_policy_document.iam_policy_doc_logging.json
}

resource "aws_iam_role_policy_attachment" "policy_attachment" {
  role       = aws_iam_role.iam_role_lambda.name
  policy_arn = aws_iam_policy.iam_policy_logging.arn
}

resource "aws_cloudwatch_log_group" "cloudwatch_log_group" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14
  skip_destroy = false

  depends_on = [ aws_iam_role_policy_attachment.policy_attachment ]
}

//<<<CloudWatch 로그  /////////////////////////////////////////////////

data "archive_file" "sample" {
  type       = "zip"
  source_dir = var.source_dir
  output_path = var.output_path
}

resource "aws_lambda_function" "lambda_function" {

  function_name = var.function_name
  role          = aws_iam_role.iam_role_lambda.arn

  #아키텍처
  #["x86_64"] and ["arm64"]. Default is ["x86_64"]
  architectures = ["x86_64"]

  #Exactly one of filename, image_uri, or s3_bucket must be specified. 
  filename = data.archive_file.sample.output_path
  #https://docs.aws.amazon.com/ko_kr/lambda/latest/api/API_CreateFunction.html#SSS-CreateFunction-request-Runtime
  runtime          = var.runtime
  handler          = "index.handler"
  source_code_hash = data.archive_file.sample.output_base64sha256

  # environment {
  #   variables = {
  #     env = var.environment
  #   }
  # }

  depends_on = [
    aws_cloudwatch_log_group.cloudwatch_log_group,
    aws_iam_role_policy_attachment.policy_attachment,
  ]
}

//함수URL 만들기
resource "aws_lambda_function_url" "function_url" {
  function_name      = aws_lambda_function.lambda_function.function_name
  authorization_type = "NONE"
}

# resource "aws_lambda_function_url" "test_live" {
#   function_name      = aws_lambda_function.test.function_name
#   qualifier          = "my_alias"
#   authorization_type = "AWS_IAM"

#   cors {
#     allow_credentials = true
#     allow_origins     = ["*"]
#     allow_methods     = ["*"]
#     allow_headers     = ["date", "keep-alive"]
#     expose_headers    = ["keep-alive", "date"]
#     max_age           = 86400
#   }
# }


data "aws_lambda_invocation" "lambda_invocation" {
  function_name = aws_lambda_function.lambda_function.function_name

  input = <<JSON
  ${jsonencode(var.input)}
  JSON
}
