<br />
<br />

<p align="center">
<a href="https://ale.run/">
  <img src="https://raw.githubusercontent.com/ale-run/ale/refs/heads/main/resources/logo/ale-wordmark-black.svg" width="160px" alt="Ale logo" />
</a>
</p>
<h3 align="center">A Fully Customizable Developer Platform</h3>
<p align="center">Ale is an extensible, self-hosted developer platform offering full customization, enabling you to build and deploy on your terms.</p>

<br />

# Ale Plugin for AWS

## Getting Started

<a href="https://docs.ale.run/" target="_blank">Read the documentation</a> or follow the steps below:

### 🔵 Supported AWS Deployment

- EC2
- ECS
- Lambda
- RDS
- Memory DB
- S3

### 📌 Requirements

- Node.js version 20 or higher
- [AWS CLI](https://aws.amazon.com/ko/cli/)
- [Terraform CLI](https://developer.hashicorp.com/terraform/install)

### 🪄 Installation (Local/VM)

1. Clone the project repository.

    ```bash
    git clone https://github.com/ale-run/plugin-aws
    ```

2. Navigate to the project directory and run the npm installation command.

    ```bash
    cd plugin-aws
    npm i
    ```

3. Run Ale with the built-in Ale Plugin for Application build and deployment.

    ```bash
    npm run dev
    ```

4. Select the target cluster for Ale.

    ```bash
    ? Select a Kubernetes context: (Use arrow keys)
      No Cluster Selected 
      orbstack 
    ❯ docker-desktop 
    (Move up and down to reveal more choices)
    ```

5. Access via the following address.

    - <http://localhost:9001>


### ▶️ Run

1. Press the + button on the dashboard or use cmd+K (ctrl+K on Windows) and select the AWS app you wish to deploy in the popup window..

2. Enter the configuration values required for deployment, then press the Deploy button.

3. After the deployment is complete, press the Connect button to access the service.

## Community support

For general help using Ale, please refer to [the official Ale documentation](https://docs.ale.run/).
For additional help, you can use one of these channels to ask a question:

- [Discord](https://discord.gg/wVafphzcRE)
- [YouTube Channel](https://www.youtube.com/@ale_run)

## Documentation

- [Ale docs](https://docs.ale.run/)

## License

See the [LICENSE](./LICENSE) file for licensing information.
