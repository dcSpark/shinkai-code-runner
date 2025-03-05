use std::path::PathBuf;

use super::path_buf_ext::PathBufExt;

pub fn normalize_error_message(error_message: String, code_folder_path: &PathBuf) -> String {
    let file_prefix_deno = "file:///";
    let file_prefix_runner = code_folder_path.as_normalized_string() + "/";
    error_message
        .replace(file_prefix_deno, "")
        .replace(file_prefix_runner.as_str(), "./")
}
