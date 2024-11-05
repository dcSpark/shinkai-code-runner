use std::collections::HashMap;

use serde_json::Value;

use crate::tools::{shinkai_tools_backend::ShinkaiToolsBackend, tool::Tool};

use super::ShinkaiToolsBackendOptions;

#[tokio::test]
async fn get_tool_definition() {
    // Just for a simple test, it could be any tool
    let code = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../apps/shinkai-tool-echo/src/index.ts"
    ))
    .to_string();
    let configurations = serde_json::json!({});

    let tool = Tool::new(
        code,
        configurations,
        Some(ShinkaiToolsBackendOptions {
            binary_path: "/opt/homebrew/bin/deno".into(),
        }),
    );

    let definition = tool.definition().await.unwrap();

    assert_eq!(definition.id, "shinkai-tool-echo");
}

#[tokio::test]
async fn run_tool() {
    // Just for a simple test, it could be any tool
    let code = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../apps/shinkai-tool-echo/src/index.ts"
    ))
    .to_string();
    let configurations = Value::Null;

    let tool = Tool::new(
        code,
        configurations,
        Some(ShinkaiToolsBackendOptions {
            binary_path: "/opt/homebrew/bin/deno".into(),
        }),
    );

    let result = tool
        .run(
            serde_json::json!({
                "message": "hello world"
            }),
            None,
        )
        .await
        .unwrap();

    assert_eq!(
        result.data,
        serde_json::json!({ "message": "echoing: hello world"})
    );
}
