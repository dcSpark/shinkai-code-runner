use std::path::{self, PathBuf};

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

#[cfg(test)]
mod tests {
    use super::{normalize_for_docker_path, PathBuf};
    #[cfg(target_os = "windows")]
    #[test]
    fn test_normalize_for_docker_path() {
        assert_eq!(
            normalize_for_docker_path(PathBuf::from("C:/Users/John/Documents/test.txt")),
            "//c/Users/John/Documents/test.txt".to_string()
        );
    }
}
