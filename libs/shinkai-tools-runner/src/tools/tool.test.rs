use std::collections::HashMap;

use serde_json::Value;

use crate::tools::{
    deno_runner_options::DenoRunnerOptions,
    execution_context::ExecutionContext, tool::Tool,
};

#[tokio::test]
async fn get_tool_definition() {
    // Just for a simple test, it could be any tool
    let code = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../apps/shinkai-tool-echo/src/index.ts"
    ))
    .to_string();
    let configurations = serde_json::json!({});

    let tool = Tool::new(code, configurations, None);

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

    let tool = Tool::new(code, configurations, None);

    let result = tool
        .run(
            None,
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

#[tokio::test]
async fn shinkai_tool_with_env() {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();
    let js_code = r#"
        function run(configurations, params) {
            return { foo: process.env.BAR };
        }
"#;
    let tool = Tool::new(js_code.to_string(), serde_json::Value::Null, None);
    let mut envs = HashMap::<String, String>::new();
    envs.insert("BAR".to_string(), "bar".to_string());
    let run_result = tool
        .run(Some(envs), serde_json::json!({ "name": "world" }), None)
        .await;
    assert!(run_result.is_ok());
    assert_eq!(run_result.unwrap().data["foo"], "bar");
}

#[tokio::test]
async fn shinkai_tool_run_concurrency() {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();
    let js_code1 = r#"
        import axios from 'npm:axios';
        async function run(configurations, params) {
            const result = await axios.get('https://jsonplaceholder.typicode.com/todos/1')
                .then(response => {
                    return {
                        status: response.status,
                        data: response.data
                    };
                });
            return result;
        }
    "#;
    let js_code2 = r#"
        import _ from 'npm:lodash';
        function run(configurations, params) {
            return {
                foo: _.add(1, 2)
            };
        }
    "#;

    let js_code3 = r#"
        import { sum } from 'npm:mathjs';
        function run(configurations, params) {
            return {
                foo: sum([1, 2, 3, 4])
            };
        }
    "#;

    let execution_storage = "./shinkai-tools-runner-execution-storage/concurrent-runs";
    let context_id = nanoid::nanoid!();
    let execution_id = nanoid::nanoid!();
    let tool1 = Tool::new(
        js_code1.to_string(),
        serde_json::Value::Null,
        Some(DenoRunnerOptions {
            context: ExecutionContext {
                storage: execution_storage.into(),
                execution_id: context_id.clone(),
                context_id: execution_id.clone(),
                code_id: "js_code1".into(),
            },
            ..Default::default()
        }),
    );
    let tool2 = Tool::new(
        js_code2.to_string(),
        serde_json::Value::Null,
        Some(DenoRunnerOptions {
            context: ExecutionContext {
                storage: execution_storage.into(),
                execution_id: context_id.clone(),
                context_id: execution_id.clone(),
                code_id: "js_code2".into(),
            },
            ..Default::default()
        }),
    );
    let tool3 = Tool::new(
        js_code3.to_string(),
        serde_json::Value::Null,
        Some(DenoRunnerOptions {
            context: ExecutionContext {
                storage: execution_storage.into(),
                execution_id: context_id.clone(),
                context_id: execution_id.clone(),
                code_id: "js_code3".into(),
            },
            ..Default::default()
        }),
    );

    let (result1, result2, result3) = tokio::join!(
        tool1.run(None, serde_json::json!({ "name": "world" }), None),
        tool2.run(None, serde_json::Value::Null, None),
        tool3.run(None, serde_json::Value::Null, None)
    );

    let run_result1 = result1.unwrap();
    let run_result2 = result2.unwrap();
    let run_result3 = result3.unwrap();

    assert_eq!(run_result1.data["status"], 200);
    assert_eq!(run_result2.data["foo"], 3);
    assert_eq!(run_result3.data["foo"], 10);
}
