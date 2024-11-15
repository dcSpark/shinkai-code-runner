use std::collections::HashMap;

use crate::tools::{
    deno_execution_storage::DenoExecutionStorage, deno_runner::DenoRunner,
    deno_runner_options::DenoRunnerOptions,
};

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

    let result = deno_runner
        .run(code, None, None)
        .await
        .map_err(|e| {
            log::error!("Failed to run deno code: {}", e);
            e
        })
        .unwrap();

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

#[tokio::test]
async fn test_write_forbidden_folder() {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();

    std::env::set_var("CI_FORCE_DENO_IN_HOST", "true");

    let mut deno_runner = DenoRunner::default();
    let code = r#"
      try {
        await Deno.writeTextFile("/test.txt", "This should fail");
        console.log('write succeeded');
      } catch (e) {
        // We expect this to fail due to permissions
        console.log('error', e);
        throw e;
      }
    "#;

    let result = deno_runner.run(code, None, None).await.map_err(|e| {
        log::error!("Failed to run deno code: {}", e);
        e
    });

    assert!(result.is_err());
}

#[tokio::test]
async fn test_execution_storage_cache_contains_files() {
    let _ = env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .is_test(true)
        .try_init();

    let test_dir =
        std::path::PathBuf::from("./shinkai-tools-runner-execution-storage/test-cache-files");

    let test_code = r#"
        import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts";
        console.log('test');
    "#;
    // Run the code to ensure dependencies are downloaded
    let mut deno_runner = DenoRunner::new(DenoRunnerOptions {
        execution_storage: test_dir.clone(),
        ..Default::default()
    });
    let _ = deno_runner.run(test_code, None, None).await.unwrap();

    // Verify cache directory contains files
    let storage = DenoExecutionStorage::new(test_dir.clone(), nanoid::nanoid!().as_str());

    assert!(storage.deno_cache.exists());
    let cache_files = std::fs::read_dir(&storage.deno_cache).unwrap();
    assert!(cache_files.count() > 0);

    // Clean up test directory
    std::fs::remove_dir_all(test_dir).unwrap();
}
