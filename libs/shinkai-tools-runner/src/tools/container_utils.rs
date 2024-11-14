use std::process::Command;

/// Checks if Docker is available on the system by attempting to run 'docker info' command.
/// This function verifies both that Docker is installed and that the Docker daemon is running.
///
/// # Details
///
/// The function executes `docker info` which requires:
/// - Docker CLI to be installed and in PATH
/// - Docker daemon to be running and accessible
/// - Current user to have permissions to access Docker
///
/// # Returns
///
/// * `true` - If Docker is fully operational (installed, running and accessible)
/// * `false` - If Docker is not available for any reason:
///   - Docker is not installed
///   - Docker daemon is not running
///   - User lacks permissions
///   - Other Docker configuration issues
///
/// # Example
///
/// ```
/// use shinkai_tools_runner::tools::container_utils;
///
/// let docker_available = container_utils::is_docker_available();
/// if docker_available {
///     println!("docker is available and ready to use");
/// } else {
///     println!("docker is not available - check installation and permissions");
/// }
/// ```
pub fn is_docker_available() -> bool {
    // Try to run 'docker info' command
    let docker_check = Command::new("docker").arg("info").output();

    match docker_check {
        Ok(output) => {
            // Check if command was successful (exit code 0)
            output.status.success()
        }
        Err(_) => false, // Docker command not found or failed to execute
    }
}
