use crate::built_in_tools::{get_tool, get_tools};

#[tokio::test]
async fn get_tools_all_load() {
    let tools = get_tools();
    for tool_code in tools {
        let mut tool_instance = crate::tools::tool::Tool::new();
        let load_result = tool_instance.load_from_code(&tool_code, "").await;
        assert!(load_result.is_ok());
    }
}

#[tokio::test]
async fn list_tools_count() {
    assert_eq!(get_tools().len(), 4);
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
