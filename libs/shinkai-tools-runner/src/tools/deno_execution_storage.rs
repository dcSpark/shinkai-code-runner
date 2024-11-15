use std::path::PathBuf;

#[derive(Default)]
pub struct DenoExecutionStorage {
    pub id: String,
    pub root: PathBuf,
    pub root_code: PathBuf,
    pub code: PathBuf,
    pub code_entrypoint: PathBuf,
    pub deno_cache: PathBuf,
    pub logs: PathBuf,
    pub home: PathBuf,
}

impl DenoExecutionStorage {
    pub fn new(root: PathBuf, id: &str) -> Self {
        let root_code = root.join("code");
        let code = root_code.join(id);
        Self {
            id: id.to_string(),
            root: root.clone(),
            root_code,
            code: code.clone(),
            code_entrypoint: code.join("index.ts"),
            deno_cache: root.join("deno-cache"),
            logs: root.join("logs"),
            home: root.join("home"),
        }
    }

    pub fn init(&self, code: &str, pristine_cache: Option<bool>) -> anyhow::Result<()> {
        for dir in [
            &self.root,
            &self.root_code,
            &self.code,
            &self.deno_cache,
            &self.logs,
            &self.home,
        ] {
            log::info!("creating directory: {}", dir.display());
            std::fs::create_dir_all(dir).map_err(|e| {
                log::error!("failed to create directory {}: {}", dir.display(), e);
                e
            })?;
        }

        log::info!("creating code file: {}", self.code_entrypoint.display());
        std::fs::write(&self.code_entrypoint, code).map_err(|e| {
            log::error!("failed to write code to index.ts: {}", e);
            e
        })?;

        if pristine_cache.unwrap_or(false) {
            std::fs::remove_dir_all(&self.deno_cache)?;
            std::fs::create_dir(&self.deno_cache)?;
            log::info!(
                "cleared deno cache directory: {}",
                self.deno_cache.display()
            );
        }

        Ok(())
    }

    pub fn get_relative_code_entrypoint(&self) -> anyhow::Result<String> {
        self.code_entrypoint
            .strip_prefix(&self.root)
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| {
                log::error!("failed to get relative path: {}", e);
                anyhow::anyhow!("failed to get relative path: {}", e)
            })
    }

    pub fn get_relative_deno_cache(&self) -> anyhow::Result<String> {
        self.deno_cache
            .strip_prefix(&self.root)
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| {
                log::error!("failed to get relative path: {}", e);
                anyhow::anyhow!("failed to get relative path: {}", e)
            })
    }

    pub fn persist_logs(&self, output: &str) -> anyhow::Result<()> {
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let log_file = self.logs.join(format!("output_{}.log", timestamp));
        std::fs::write(&log_file, output).map_err(|e| {
            log::error!("failed to write output to log file: {}", e);
            e
        })?;
        log::info!("wrote output to {}", log_file.display());
        Ok(())
    }
}

// We do best effort to remove ephemereal folders
impl Drop for DenoExecutionStorage {
    fn drop(&mut self) {
        if let Err(e) = std::fs::remove_dir_all(&self.code) {
            log::warn!(
                "failed to remove code directory {}: {}",
                self.code.display(),
                e
            );
        } else {
            log::info!("removed code directory: {}", self.code.display());
        }
    }
}

#[cfg(test)]
#[path = "deno_execution_storage.test.rs"]
mod tests;
