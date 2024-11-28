use std::collections::HashMap;

use serde_json::Value;

use crate::{
    built_in_tools::{get_tool, get_tools},
    tools::code_files::CodeFiles,
};

#[tokio::test]
async fn list_tools_count() {
    assert!(get_tools().len() >= 5);
}

#[tokio::test]
async fn get_tool_unexisting() {
    let tool = get_tool("unexisting");
    assert!(tool.is_none());
}

#[tokio::test]
async fn get_tools_existing() {
    let tool = get_tool("shinkai-tool-echo");
    assert!(tool.is_some());
}
