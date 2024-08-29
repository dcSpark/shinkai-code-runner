use std::process::{Child, Command};

use super::shinkai_tools_backend_options::ShinkaiToolsBackendOptions;

#[derive(Default)]
pub struct ShinkaiToolsBackend {
    child: Option<Child>,
    options: ShinkaiToolsBackendOptions,
}

impl ShinkaiToolsBackend {
    pub fn new(options: ShinkaiToolsBackendOptions) -> Self {
        ShinkaiToolsBackend {
            options,
            ..Default::default()
        }
    }

    pub async fn run(&mut self) -> Result<(), std::io::Error> {
        if self.child.is_some() {
            println!("Killing existing child process.");
            self.kill().await?;
        }

        let child_process = Command::new(self.options.binary_path.clone())
            .env("PORT", self.options.api_port.to_string())
            .spawn()
            .map_err(|e| {
                println!("Error spawning child process: {}", e);
                e
            })?;
        let pid = child_process.id();
        self.child = Some(child_process);
        println!("Started new child process with PID: {}", pid);

        let client = reqwest::Client::new();

        // Wait for the /health endpoint to respond with 200
        let health_check_url = "http://127.0.0.1:3000/health";
        let mut retries = 5;
        while retries > 0 {
            match client.get(health_check_url).send().await {
                Ok(response) if response.status().is_success() => {
                    println!("Health check successful.");
                    break;
                }
                Err(e) => {
                    println!("Health check failed: {}, retrying...", e);
                }
                _ => {
                    println!(
                        "Health check response was not successful, retries left: {}",
                        retries
                    );
                }
            }
            retries -= 1;
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
        Ok(())
    }

    // Method to kill the child process
    pub async fn kill(&mut self) -> Result<(), std::io::Error> {
        if let Some(mut child) = self.child.take() {
            tokio::task::spawn_blocking(move || child.kill()).await??;
            self.child = None;
        }
        println!("Killing the child process if it exists.");
        Ok(())
    }
}
