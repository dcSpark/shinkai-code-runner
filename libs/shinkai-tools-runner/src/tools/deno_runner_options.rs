use std::path::PathBuf;

#[derive(Clone)]
pub struct DenoRunnerOptions {
    pub execution_storage: PathBuf,
    pub deno_binary_path: PathBuf,
    pub deno_image_name: String,
}

impl Default for DenoRunnerOptions {
    fn default() -> Self {
        Self {
            execution_storage: PathBuf::from("./shinkai-tools-runner-execution-storage").join(nanoid::nanoid!()),
            deno_image_name: String::from("denoland/deno:alpine-2.0.6"),
            deno_binary_path: PathBuf::from(if cfg!(windows) {
                "./shinkai-tools-runner-resources/deno.exe"
            } else {
                "./shinkai-tools-runner-resources/deno"
            }),
        }
    }
}
