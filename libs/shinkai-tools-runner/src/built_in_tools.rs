use lazy_static::lazy_static;
use std::collections::HashMap;

use crate::tools::tool_definition::ToolDefinition;

lazy_static! {
    static ref TOOLS_PATHS: HashMap<&'static str, &'static ToolDefinition> = {
        let mut m = HashMap::new();
        // ntim: New tools will be inserted here, don't remove this comment
        m
    };
}

pub fn get_tool(name: &str) -> Option<&&ToolDefinition> {
    TOOLS_PATHS.get(name)
}

pub fn get_tools() -> Vec<(String, ToolDefinition)> {
    TOOLS_PATHS
        .iter()
        .map(|(&name, &definition)| (name.to_string(), definition.clone()))
        .collect()
}

#[cfg(test)]
#[path = "built_in_tools.test.rs"]
mod tests;
