use std::path::PathBuf;

#[derive(Default)]
pub struct DenoExecutionStorage {
    pub root: PathBuf,
    pub code: PathBuf,
    pub code_entrypoint: PathBuf,
    pub deno_cache: PathBuf,
    pub logs: PathBuf,
}

impl DenoExecutionStorage {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root: root.clone(),
            code: root.join("code"),
            code_entrypoint: root.join("code/index.ts"),
            deno_cache: root.join("deno-cache"),
            logs: root.join("logs"),
        }
    }

    pub fn init(&self, code: &str) -> anyhow::Result<()> {
        for dir in [&self.root, &self.code, &self.deno_cache, &self.logs] {
            std::fs::create_dir_all(dir).map_err(|e| {
                log::error!("failed to create directory {}: {}", dir.display(), e);
                e
            })?;
        }

        let code_file = self.code.join("index.ts");
        std::fs::write(&code_file, code).map_err(|e| {
            log::error!("failed to write code to index.ts: {}", e);
            e
        })?;
        log::info!("wrote code to {}", code_file.display());
        Ok(())
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
