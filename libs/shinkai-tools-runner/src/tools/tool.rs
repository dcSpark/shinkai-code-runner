use serde_json::Value;

use super::{
    execution_error::ExecutionError, run_result::RunResult,
    shinkai_tools_backend::ShinkaiToolsBackend,
    shinkai_tools_backend_options::ShinkaiToolsBackendOptions, tool_definition::ToolDefinition,
};

pub struct Tool {
    code: String,
    configurations: Value,
    shinkai_tools_backend_options: ShinkaiToolsBackendOptions,
}

impl Tool {
    pub const MAX_EXECUTION_TIME_MS_INTERNAL_OPS: u64 = 1000;

    pub fn new(
        code: String,
        configurations: Value,
        shinkai_tools_backend_options: Option<ShinkaiToolsBackendOptions>,
    ) -> Self {
        let options = shinkai_tools_backend_options.unwrap_or_default();
        Tool {
            code,
            configurations,
            shinkai_tools_backend_options: options,
        }
    }

    pub async fn definition(&self) -> Result<ToolDefinition, ExecutionError> {
        println!("preparing to get tool definition from code");

        let mut shinkai_tool_backend =
            ShinkaiToolsBackend::new(self.shinkai_tools_backend_options.clone());

        // Empty envs when get definition
        let envs = std::collections::HashMap::new();
        let code = format!(
            r#"
            {}
            console.log("<shinkai-tool-definition>");
            console.log(JSON.stringify(definition));
            console.log("</shinkai-tool-definition>");
        "#,
            &self.code.to_string()
        );
        let result = shinkai_tool_backend.run(&code, envs).await.map_err(|e| {
            ExecutionError::new(format!("Failed to run shinkai tool backend: {}", e), None)
        })?;

        let result_text = result
            .lines()
            .skip_while(|line| !line.contains("<shinkai-tool-definition>"))
            .skip(1)
            .take_while(|line| !line.contains("</shinkai-tool-definition>"))
            .collect::<Vec<&str>>()
            .join("\n");

        println!("result text: {}", result_text);

        let tool_definition: ToolDefinition = serde_json::from_str(&result_text).map_err(|e| {
            println!("failed to parse tool definition: {}", e);
            ExecutionError::new(format!("failed to parse tool definition: {}", e), None)
        })?;

        println!(
            "successfully retrieved tool definition: {:?}",
            tool_definition
        );
        Ok(tool_definition)
    }

    pub async fn run(
        &self,
        parameters: Value,
        max_execution_time_s: Option<u64>,
    ) -> Result<RunResult, ExecutionError> {
        println!("preparing to run tool");
        println!("configurations: {:?}", self.configurations);
        println!("parameters: {:?}", parameters);

        let mut shinkai_tool_backend =
            ShinkaiToolsBackend::new(self.shinkai_tools_backend_options.clone());
        // Empty envs when get definition
        let envs = std::collections::HashMap::new();
        let code = format!(
            r#"
            {}
            const configurations = JSON.parse({});
            const parameters = JSON.parse({});

            const result = await run(configurations, parameters);
            console.log("<shinkai-tool-result>");
            console.log(JSON.stringify(result));
            console.log("</shinkai-tool-result>");
        "#,
            &self.code.to_string(),
            serde_json::to_string(&self.configurations).unwrap(),
            serde_json::to_string(&parameters.to_string()).unwrap(),
        );
        let result = shinkai_tool_backend.run(&code, envs).await.map_err(|e| {
            ExecutionError::new(format!("Failed to run shinkai tool backend: {}", e), None)
        })?;

        let result_text = result
            .lines()
            .skip_while(|line| !line.contains("<shinkai-tool-result>"))
            .skip(1)
            .take_while(|line| !line.contains("</shinkai-tool-result>"))
            .collect::<Vec<&str>>()
            .join("\n");

        println!("result text: {}", result_text);

        let result: Value = serde_json::from_str(&result_text).map_err(|e| {
            println!("failed to parse result: {}", e);
            ExecutionError::new(format!("failed to parse result: {}", e), None)
        })?;
        println!("successfully parsed run result: {:?}", result);
        Ok(RunResult { data: result })
    }
}

#[cfg(test)]
#[path = "tool.test.rs"]
mod tests;
