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
        println!(
            "running command with binary path: {:?}",
            self.options.binary_path
        );
        let binary_path = self.options.binary_path.clone();
        let mut command = Command::new(binary_path);
        let command = command
            .args(["eval", code, "--ext", "ts"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .env("MAX_ARG_STRLEN", "999999999999999")
            .envs(envs);

        println!("spawning command...");
        let child = command.spawn()?;
        let output = child.wait_with_output()?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            println!("command failed with error: {}", error);
            return Err(std::io::Error::new(std::io::ErrorKind::Other, error));
        }

        let output = String::from_utf8_lossy(&output.stdout);

        println!("output string: {}", output);
        Ok(output.to_string())
    }
}

#[cfg(test)]
#[path = "shinkai_tools_backend.test.rs"]
mod tests;
