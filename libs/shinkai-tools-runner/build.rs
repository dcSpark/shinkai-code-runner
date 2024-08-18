use std::env;
use std::fs;
use std::path::Path;
fn main() {
    // Re-runs script if any files in res are changed
    println!("cargo:rerun-if-changed=resources/*");

    let resources_path = Path::new("shinka-tools-runner-resources");
    let target_path = Path::new(&env::var("OUT_DIR").unwrap()).join("shinka-tools-runner-resources");

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
}
