use std::{collections::HashMap, process::Command};

use super::shinkai_tools_backend_options::ShinkaiToolsBackendOptions;

#[derive(Default)]
pub struct ShinkaiToolsBackend {
    options: ShinkaiToolsBackendOptions,
}

impl ShinkaiToolsBackend {
    pub fn new(options: ShinkaiToolsBackendOptions) -> Self {
        ShinkaiToolsBackend {
            options,
            ..Default::default()
        }
    }

    pub async fn run(
        &mut self,
        code: &str,
        envs: HashMap<String, String>,
    ) -> Result<String, std::io::Error> {
        log::info!(
            "running command with binary path: {:?}",
            self.options.binary_path
        );
        let binary_path = self.options.binary_path.clone();

        let temp_file = tempfile::NamedTempFile::new()?;
        log::info!("writing code to temp file: {:?}", temp_file.path());
        std::fs::write(temp_file.path(), code).map_err(|e| {
            log::error!("failed to write code to temp file: {}", e);
            e
        })?;

        let deno_permissions = ["--allow-all"];
        let mut command = Command::new(binary_path);
        let command = command
            .args(["run", "--ext", "ts"])
            .args(deno_permissions)
            .arg(temp_file.path().to_str().unwrap())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .envs(envs);
        log::info!("spawning command...");
        let child = command.spawn()?;
        let output = child.wait_with_output()?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            log::info!("command failed with error: {}", error);
            return Err(std::io::Error::new(std::io::ErrorKind::Other, error));
        }

        let output = String::from_utf8_lossy(&output.stdout);

        log::info!("output string: {}", output);
        Ok(output.to_string())
    }
}

#[cfg(test)]
#[path = "shinkai_tools_backend.test.rs"]
mod tests;
