use std::path::PathBuf;

#[derive(Clone)]
pub struct ShinkaiToolsBackendOptions {
    pub binary_path: PathBuf,
}

impl Default for ShinkaiToolsBackendOptions {
    fn default() -> Self {
        Self {
            binary_path: PathBuf::from("./shinkai-tools-runner-resources/shinkai-tools-backend"),
        }
    }
}
