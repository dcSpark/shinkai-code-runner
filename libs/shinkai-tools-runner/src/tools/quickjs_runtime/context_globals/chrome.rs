use headless_chrome::{Browser, LaunchOptionsBuilder};
use rquickjs::{
    class::Trace, function::Func, Class, Ctx, Object, Promise, Result, String as RQString, Value,
};
use std::io;

#[derive(Trace)]
#[rquickjs::class(rename = "HeadlessChrome")]
pub struct HeadlessChrome {
    #[qjs(skip_trace)]
    browser: Browser,
}

#[rquickjs::methods]
impl HeadlessChrome {
    #[qjs(constructor)]
    pub fn new() -> Result<Self> {
        let launch_options = LaunchOptionsBuilder::default()
            .headless(true)
            .build()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

        let browser = Browser::new(launch_options)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

        Ok(HeadlessChrome { browser })
    }

    pub fn navigate<'js>(&self, ctx: Ctx<'js>, url: String) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let browser = self.browser.clone();
        let ctx_clone = ctx.clone(); // Clone ctx here
        ctx.spawn(async move {
            let tab = match browser.new_tab() {
                Ok(tab) => tab,
                Err(e) => {
                    reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                    return;
                }
            };
            if let Err(e) = tab.navigate_to(&url) {
                reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                return;
            }
            if let Err(e) = tab.wait_until_navigated() {
                reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                return;
            }
            match tab.get_content() {
                Ok(content) => {
                    let js_string = RQString::from_str(ctx_clone.clone(), &content).unwrap();
                    resolve.call::<(Value,), ()>((js_string.into(),)).unwrap();
                }
                Err(e) => {
                    reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                }
            }
        });
        Ok(promise)
    }
}

pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();
    Class::<HeadlessChrome>::define(&globals)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::tools::tool::Tool;

    use super::init;
    use rquickjs::{Context, Promise, Runtime, String as RQString, Value};
    use tokio::runtime::Runtime as TokioRuntime;

    #[tokio::test]
    async fn shinkai_tool_inline() {
        let js_code = r#"
        class BaseTool {
            constructor(config) {
                this.config = config;
            }
            setConfig(value) {
                this.config = value;
                return this.config;
            }
            getConfig() {
                return this.config;
            }
        }

        class Tool extends BaseTool {
            constructor(config) {
                super(config);
            }
            async run(params) {
                const browser = new HeadlessChrome();
                const content = await browser.navigate('https://example.com');
                return { data: `Hello, ${params.name}! Content: ${content}` };
            }
        }

        globalThis.tool = { Tool };
        "#;

        let mut tool = Tool::new();
        let _ = tool.load_from_code(js_code, "").await;
        let run_result = tool.run("{ \"name\": \"world\" }", None).await.unwrap();
        eprintln!("{:?}", run_result);
        // assert!(run_result.data.contains("Hello, world!"));
    }
}
