use std::collections::HashMap;

use crate::tools::deno_runner::DenoRunner;

use super::DenoRunnerOptions;

#[tokio::test]
async fn test_run_echo_tool() {
    let mut deno_runner = DenoRunner::new(DenoRunnerOptions {
        binary_path: "/opt/homebrew/bin/deno".into(),
    });
    let code = r#"
      console.log('{"message":"hello world"}');
    "#;

    let result = deno_runner
        .run(
            code,
            HashMap::from([
                (
                    "configurations".to_string(),
                    serde_json::json!({}).to_string(),
                ),
                ("parameters".to_string(), serde_json::json!({}).to_string()),
            ]),
            None,
        )
        .await
        .unwrap();

    assert_eq!(
        result,
        "{\"message\":\"hello world\"}\n"
    );
}
