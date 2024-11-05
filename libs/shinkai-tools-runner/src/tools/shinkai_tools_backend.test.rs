use std::collections::HashMap;

use crate::tools::shinkai_tools_backend::ShinkaiToolsBackend;

use super::ShinkaiToolsBackendOptions;

#[tokio::test]
async fn test_run_echo_tool() {
    let mut backend = ShinkaiToolsBackend::new(ShinkaiToolsBackendOptions {
        binary_path: "/opt/homebrew/bin/deno".into(),
    });
    let code = r#"
      console.log("{\"message\": \"hello world\"}");
    "#;

    let result = backend
        .run(
            code,
            HashMap::from([
                (
                    "configurations".to_string(),
                    serde_json::json!({}).to_string(),
                ),
                (
                    "parameters".to_string(),
                    serde_json::json!({}).to_string(),
                ),
            ]),
        )
        .await
        .unwrap();

    assert_eq!(
        result,
        serde_json::json!({
            "message": "hello world"
        })
    );
}
