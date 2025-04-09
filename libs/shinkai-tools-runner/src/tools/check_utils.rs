use std::path::PathBuf;

use super::path_buf_ext::PathBufExt;

pub fn normalize_error_message(error_message: String, code_folder_path: &PathBuf) -> String {
    let file_prefix_runner = code_folder_path.as_normalized_string() + "/";
    let file_regex = regex::Regex::new(format!("file:/+{file_prefix_runner}").as_str()).unwrap();
    file_regex.replace_all(&error_message, "./").to_string()
}
