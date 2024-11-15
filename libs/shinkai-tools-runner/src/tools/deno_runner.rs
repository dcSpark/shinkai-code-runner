use tokio::{
    io::{AsyncBufReadExt, BufReader},
    select,
};

use crate::tools::deno_execution_storage::DenoExecutionStorage;

use super::{container_utils::DockerStatus, deno_runner_options::DenoRunnerOptions};
use std::{collections::HashMap, time::Duration};

#[derive(Default)]
pub struct DenoRunner {
    options: DenoRunnerOptions,
}

impl DenoRunner {
    pub fn new(options: DenoRunnerOptions) -> Self {
        DenoRunner { options }
    }

    /// Runs Deno code either in a Docker container or directly on the host system.
    ///
    /// The execution environment is determined automatically based on whether Docker is available.
    /// If Docker is detected, the code runs in an isolated container using the configured Deno image.
    /// Otherwise, it falls back to running directly on the host using a local Deno binary.
    ///
    /// # Arguments
    ///
    /// * `code` - The Deno/TypeScript code to execute as a string
    /// * `envs` - Optional HashMap of environment variables to pass to the execution environment
    /// * `max_execution_time_s` - Optional timeout in seconds after which execution will be terminated
    ///
    /// # Returns
    ///
    /// Returns a Result containing:
    /// - Ok(String): The combined stdout/stderr output from the code execution
    /// - Err(anyhow::Error): Any errors that occurred during setup or execution
    ///
    /// # Example
    ///
    /// ```no_run
    /// let mut runner = DenoRunner::new(DenoRunnerOptions::default());
    /// let result = runner.run(
    ///     "console.log('Hello from Deno!')",
    ///     None,
    ///     Some(30)
    /// ).await?;
    /// ```
    pub async fn run(
        &mut self,
        code: &str,
        envs: Option<HashMap<String, String>>,
        max_execution_time_ms: Option<u64>,
    ) -> anyhow::Result<Vec<String>> {
        let force_deno_in_host =
            std::env::var("CI_FORCE_DENO_IN_HOST").unwrap_or(String::from("false")) == *"true";
        if !force_deno_in_host
            && super::container_utils::is_docker_available() == DockerStatus::Running
        {
            self.run_in_docker(code, envs, max_execution_time_ms).await
        } else {
            self.run_in_host(code, envs, max_execution_time_ms).await
        }
    }

    async fn run_in_docker(
        &mut self,
        code: &str,
        envs: Option<HashMap<String, String>>,
        max_execution_time_ms: Option<u64>,
    ) -> anyhow::Result<Vec<String>> {
        log::info!(
            "using deno from container image:{:?}",
            self.options.deno_image_name
        );

        let execution_storage = DenoExecutionStorage::new(self.options.context.clone());
        execution_storage.init(code, None)?;

        let mount_param = format!("{}:/app", execution_storage.root.to_str().unwrap());

        let mut container_envs = Vec::<String>::new();

        container_envs.push(String::from("-e"));
        container_envs.push(format!(
            "DENO_DIR={}",
            execution_storage.get_relative_deno_cache()?
        ));
        if let Some(envs) = envs {
            for (key, value) in envs {
                let env = format!("{}={}", key, value);
                container_envs.push(String::from("-e"));
                container_envs.push(env);
            }
        }
        let code_entrypoint = execution_storage.get_relative_code_entrypoint()?;
        let mut command = tokio::process::Command::new("docker");
        let mut args = ["run", "-it", "-v", mount_param.as_str()].to_vec();
        args.extend(container_envs.iter().map(|s| s.as_str()));
        args.extend([
            "--workdir",
            "/app",
            self.options.deno_image_name.as_str(),
            "run",
            "--ext",
            "ts",
            "--allow-all",
            code_entrypoint.as_str(),
        ]);
        let command = command
            .args(args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .kill_on_drop(true);

        log::info!("spawning docker command");
        let mut child = command.spawn().map_err(|e| {
            log::error!("failed to spawn command: {}", e);
            e
        })?;

        let stdout = child.stdout.take().expect("Failed to get stdout");
        let mut stdout_stream = BufReader::new(stdout).lines();

        let stderr = child.stderr.take().expect("Failed to get stderr");
        let mut stderr_stream = BufReader::new(stderr).lines();

        let mut stdout_lines = Vec::new();
        let mut stderr_lines = Vec::new();

        loop {
            select! {
                Ok(line) = stdout_stream.next_line() => match line {
                    Some(line) => {
                        stdout_lines.push(line.clone());
                        let _ = execution_storage.append_log(line.as_str());
                    },
                    None => break,
                },
                Ok(line) = stderr_stream.next_line() => match line {
                    Some(line) => {
                        stderr_lines.push(line.clone());
                        let _ = execution_storage.append_log(line.as_str());
                    },
                    None => break,
                },
                else => break,
            }
        }

        let output = if let Some(timeout) = max_execution_time_ms {
            let timeout_duration = std::time::Duration::from_millis(timeout);
            log::info!("executing command with {}ms timeout", timeout);
            match tokio::time::timeout(timeout_duration, child.wait_with_output()).await {
                Ok(result) => result?,
                Err(_) => {
                    log::error!("command execution timed out after {}ms", timeout);
                    return Err(anyhow::anyhow!(
                        "process timed out after {} seconds",
                        timeout
                    ));
                }
            }
        } else {
            log::info!("executing command without timeout");
            child.wait_with_output().await?
        };
        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stdout);
            log::error!("command execution failed: {}", error);
            return Err(anyhow::anyhow!("command execution failed: {}", error));
        }

        log::debug!(
            "command completed successfully with output: {:?}",
            stdout_lines
        );
        Ok(stdout_lines)
    }

    async fn run_in_host(
        &mut self,
        code: &str,
        envs: Option<HashMap<String, String>>,
        max_execution_time_ms: Option<u64>,
    ) -> anyhow::Result<Vec<String>> {
        log::info!(
            "using deno from host at path: {:?}",
            self.options.deno_binary_path
        );
        let binary_path = self.options.deno_binary_path.clone();

        let execution_storage = DenoExecutionStorage::new(self.options.context.clone());
        execution_storage.init(code, None)?;

        let home_permissions =
            format!("--allow-write={}", execution_storage.home.to_string_lossy());
        let deno_permissions_host: Vec<&str> = vec![
            "--allow-env",
            "--allow-run",
            "--allow-net",
            "--allow-sys",
            "--allow-scripts",
            "--allow-ffi",
            "--allow-import",
            "--allow-read=.",
            "--allow-write=/var/folders",
            "--allow-read=/var/folders",
            "--allow-read=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "--allow-read=/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
            "--allow-read=/Applications/Chromium.app/Contents/MacOS/Chromium",
            "--allow-read=C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "--allow-read=C:\\Program Files (x86)\\Google\\Chrome SxS\\Application\\chrome.exe",
            "--allow-read=C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
            home_permissions.as_str(),
        ];

        let mut command = tokio::process::Command::new(binary_path);
        let command = command
            .args(["run", "--ext", "ts"])
            .args(deno_permissions_host)
            .arg(execution_storage.code_entrypoint.clone())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .kill_on_drop(true);

        command.env("DENO_DIR", execution_storage.deno_cache.clone());
        if let Some(envs) = envs {
            command.envs(envs);
        }
        log::info!("prepared command with arguments: {:?}", command);
        let mut child = command.spawn()?;

        let stdout = child.stdout.take().expect("Failed to get stdout");
        let mut stdout_stream = BufReader::new(stdout).lines();

        let stderr = child.stderr.take().expect("Failed to get stderr");
        let mut stderr_stream = BufReader::new(stderr).lines();

        let mut stdout_lines = Vec::new();
        let mut stderr_lines = Vec::new();
        loop {
            select! {
                Ok(line) = stdout_stream.next_line() => match line {
                    Some(line) => {
                        stdout_lines.push(line.clone());
                        let _ = execution_storage.append_log(line.as_str());
                    },
                    None => break,
                },
                Ok(line) = stderr_stream.next_line() => match line {
                    Some(line) => {
                        stderr_lines.push(line.clone());
                        let _ = execution_storage.append_log(line.as_str());
                    },
                    None => break,
                },
                else => break,
            }
        }

        let output = if let Some(timeout) = max_execution_time_ms {
            let timeout_duration = std::time::Duration::from_millis(timeout);
            log::info!("executing command with {}ms timeout", timeout);
            match tokio::time::timeout(timeout_duration, child.wait_with_output()).await {
                Ok(result) => result?,
                Err(_) => {
                    log::error!("command execution timed out after {}ms", timeout);
                    return Err(anyhow::Error::new(std::io::Error::new(
                        std::io::ErrorKind::TimedOut,
                        format!("process timed out after {} seconds", timeout),
                    )));
                }
            }
        } else {
            log::info!("executing command without timeout");
            child.wait_with_output().await?
        };
        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            log::error!("command execution failed: {}", error);
            return Err(anyhow::Error::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                error.to_string(),
            )));
        }
        log::info!(
            "command completed successfully with output: {:?}",
            stdout_lines
        );
        Ok(stdout_lines)
    }
}

#[cfg(test)]
#[path = "deno_runner.test.rs"]
mod tests;
