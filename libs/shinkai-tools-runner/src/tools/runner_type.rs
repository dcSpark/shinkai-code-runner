use super::container_utils::{is_docker_available, DockerStatus};

#[derive(Clone)]
pub enum RunnerType {
    Host,
    Docker,
}

pub fn resolve_runner_type(force_runner_type: Option<RunnerType>) -> RunnerType {
    if let Some(force_runner_type) = force_runner_type {
        return force_runner_type.clone();
    }
    if is_docker_available() == DockerStatus::Running {
        RunnerType::Docker
    } else {
        RunnerType::Host
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_resolve_runner_type() {
        let force_runner_type = Some(RunnerType::Host);
        let runner_type = resolve_runner_type(force_runner_type);
        assert!(matches!(runner_type, RunnerType::Host));
    }

    #[tokio::test]
    async fn test_resolve_runner_type_docker() {
        let force_runner_type = Some(RunnerType::Docker);
        let runner_type = resolve_runner_type(force_runner_type);
        assert!(matches!(runner_type, RunnerType::Docker));
    }

    #[tokio::test]
    async fn test_resolve_runner_type_docker_not_running() {
        let force_runner_type = None;
        let runner_type = resolve_runner_type(force_runner_type);
        let is_docker_available = is_docker_available();
        assert!(
            ((is_docker_available == DockerStatus::NotRunning
                || is_docker_available == DockerStatus::NotInstalled)
                && matches!(runner_type, RunnerType::Host))
                || (is_docker_available == DockerStatus::Running
                    && matches!(runner_type, RunnerType::Docker))
        );
    }
}
