use std::collections::HashMap;

use crate::tools::deno_runner::DenoRunner;

#[tokio::test]
async fn test_run_echo_tool() {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();

    let mut deno_runner = DenoRunner::default();
    let code = r#"
      console.log('{"message":"hello world"}');
    "#;

    let result = deno_runner.run(code, None, None).await.map_err(|e| {
        log::error!("Failed to run deno code: {}", e);
        e
    }).unwrap();

    assert_eq!(result, "{\"message\":\"hello world\"}");
}

#[tokio::test]
async fn test_run_with_env() {

    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();

    let mut deno_runner = DenoRunner::default();
    let code = r#"
      console.log(process.env.HELLO_WORLD);
    "#;

    let mut envs = HashMap::<String, String>::new();
    envs.insert("HELLO_WORLD".to_string(), "hello world!".to_string()); // Insert the key-value pair
    let result = deno_runner.run(code, Some(envs), None).await.unwrap();

    assert_eq!(result, "hello world!");
}
