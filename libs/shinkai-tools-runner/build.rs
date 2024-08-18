use std::env;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=resources/*");

    let resources_path = Path::new("shinka-tools-runner-resources");
    let target_path =
        Path::new(&env::var("OUT_DIR").unwrap()).join("shinka-tools-runner-resources");

    if resources_path.exists() {
        fs::create_dir_all(&target_path).unwrap();
        for entry in fs::read_dir(resources_path).unwrap() {
            let entry = entry.unwrap();
            let file_name = entry.file_name();
            let source = entry.path();
            let destination = target_path.join(file_name);
            fs::copy(source, destination).unwrap();
        }
    }

    let backend_path = target_path.join("shinkai-tools-backend");

    if backend_path.exists() {
        #[cfg(unix)]
        {
            let mut permissions = fs::metadata(&backend_path).unwrap().permissions();
            permissions.set_mode(0o755); // Set executable permissions for Unix
        }
        #[cfg(windows)]
        {
            let metadata = fs::metadata(&backend_path).unwrap();
            let readonly = metadata.permissions().readonly();
            if readonly {
                fs::set_permissions(&backend_path, metadata.permissions()).unwrap();
            }
        }
    }
}
