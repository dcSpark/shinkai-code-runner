use std::path::{self, PathBuf};

use serde_json::Value;

use super::path_buf_ext::PathBufExt;

pub fn sanitize_for_file_name(file_name: String) -> String {
    file_name.replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "")
}

pub fn normalize_for_docker_path(path: PathBuf) -> String {
    let absolute_path = path::absolute(path).unwrap().as_normalized_string();
    let regex = regex::Regex::new(r"^([A-Z]):/").unwrap();
    if let Some(captures) = regex.captures(&absolute_path) {
        let drive_letter = captures.get(1).unwrap().as_str().to_lowercase();
        absolute_path.replacen(&captures[0], &format!("//{}/", drive_letter), 1)
    } else {
        absolute_path
    }
}

pub fn adapt_paths_in_value(
    value: &Value,
    mount_files: &std::collections::HashSet<String>,
) -> Value {
    match value {
        Value::String(s) => {
            // Check if the string is in the mount_files list
            if mount_files.contains(s) {
                // Use normalize_for_docker_path if we're in Docker mode
                let normalized = normalize_for_docker_path(PathBuf::from(s.clone()));
                Value::String(normalized)
            } else {
                value.clone()
            }
        }
        Value::Array(arr) => {
            let mut new_arr = Vec::with_capacity(arr.len());
            for item in arr.iter() {
                new_arr.push(adapt_paths_in_value(item, mount_files));
            }
            Value::Array(new_arr)
        }
        Value::Object(obj) => {
            let mut new_obj = serde_json::Map::new();
            for (key, val) in obj {
                new_obj.insert(key.clone(), adapt_paths_in_value(val, mount_files));
            }
            Value::Object(new_obj)
        }
        _ => value.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(target_os = "windows")]
    #[test]
    fn test_normalize_for_docker_path() {
        assert_eq!(
            normalize_for_docker_path(PathBuf::from("C:/Users/John/Documents/test.txt")),
            "//c/Users/John/Documents/test.txt".to_string()
        );
    }
}
