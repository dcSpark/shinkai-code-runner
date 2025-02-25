use std::collections::HashMap;
use std::time::Duration;

use crate::tools::code_files::CodeFiles;
use crate::tools::deno_runner::DenoRunner;
use crate::tools::deno_runner_options::DenoRunnerOptions;
use crate::tools::runner_type::RunnerType;

use rstest::rstest;

#[rstest]
#[case::host(RunnerType::Host)]
#[case::docker(RunnerType::Docker)]
#[tokio::test]
async fn shinkai_tool_inline(#[case] runner_type: RunnerType) {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();
    let js_code = r#"
        function run(configurations, params) {
            return { message: `Hello, ${params.name}!` };
        }
"#;
    let code_files = CodeFiles {
        files: HashMap::from([("main.ts".to_string(), js_code.to_string())]),
        entrypoint: "main.ts".to_string(),
    };
    let tool = DenoRunner::new(
        code_files,
        serde_json::Value::Null,
        Some(DenoRunnerOptions {
            force_runner_type: Some(runner_type),
            ..Default::default()
        }),
    );
    let run_result = tool
        .run(None, serde_json::json!({ "name": "world" }), None)
        .await
        .unwrap();
    assert_eq!(run_result.data["message"], "Hello, world!");
}

#[rstest]
#[case::host(RunnerType::Host)]
#[case::docker(RunnerType::Docker)]
#[tokio::test]
async fn shinkai_tool_inline_non_json_return(#[case] runner_type: RunnerType) {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();
    let js_code = r#"
        function run(configurations, params) {
            return 5;
        }
"#;
    let code_files = CodeFiles {
        files: HashMap::from([("main.ts".to_string(), js_code.to_string())]),
        entrypoint: "main.ts".to_string(),
    };
    let tool = DenoRunner::new(
        code_files,
        serde_json::Value::Null,
        Some(DenoRunnerOptions {
            force_runner_type: Some(runner_type),
            ..Default::default()
        }),
    );
    let run_result = tool.run(None, serde_json::json!({}), None).await.unwrap();
    assert_eq!(run_result.data, 5);
}

#[rstest]
#[case::host(RunnerType::Host)]
#[case::docker(RunnerType::Docker)]
#[tokio::test]
async fn max_execution_time(#[case] runner_type: RunnerType) {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();
    let js_code = r#"
        async function run() {
            let startedAt = Date.now();
            const sleepMs = 100;
            while (true) {
                const elapse = Date.now() - startedAt;
                console.log(`while true sleeping ${sleepMs}ms, elapse ${elapse} ms`);
                await new Promise(async (resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, sleepMs);
                });
            }
            return { data: true };
        }
"#;
    let code_files = CodeFiles {
        files: HashMap::from([("main.ts".to_string(), js_code.to_string())]),
        entrypoint: "main.ts".to_string(),
    };
    let tool = DenoRunner::new(
        code_files,
        serde_json::Value::Null,
        Some(DenoRunnerOptions {
            force_runner_type: Some(runner_type),
            ..Default::default()
        }),
    );
    let run_result = tool
        .run(
            None,
            serde_json::json!({ "timeoutMs": 100 }),
            Some(Duration::from_secs(2)),
        )
        .await;
    assert!(run_result.is_err());
    assert!(run_result.err().unwrap().message().contains("timed out"));
}
