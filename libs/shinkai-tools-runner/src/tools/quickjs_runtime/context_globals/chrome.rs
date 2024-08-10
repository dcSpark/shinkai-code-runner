use headless_chrome::{Browser, LaunchOptionsBuilder, Tab};
use rquickjs::IntoJs;
use rquickjs::{class::Trace, Class, Ctx, Object, Promise, Result, String as RQString, Value};
use std::{borrow::Borrow, io, sync::Arc, time::Duration};
use tokio::sync::Mutex;

#[derive(Trace)]
#[rquickjs::class(rename = "HeadlessChrome")]
pub struct HeadlessChrome {
    #[qjs(skip_trace)]
    browser: Arc<Mutex<Browser>>,
}

#[derive(Clone, Trace)]
#[rquickjs::class(rename = "TabWrapper")]
pub struct TabWrapper {
    #[qjs(skip_trace)]
    tab: Arc<Mutex<Arc<Tab>>>,
}

#[rquickjs::methods]
impl HeadlessChrome {
    #[qjs(constructor)]
    pub fn new(chrome_path: Option<String>) -> Result<Self> {
        let launch_options = if let Some(path) = chrome_path {
            LaunchOptionsBuilder::default()
                .path(Some(std::path::PathBuf::from(path)))
                .headless(true)
                .devtools(false) // Ensure devtools is set to false
                .build()
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?
        } else {
            LaunchOptionsBuilder::default()
                .headless(true)
                .devtools(false) // Ensure devtools is set to false
                .build()
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?
        };

        let browser = Browser::new(launch_options)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

        Ok(HeadlessChrome {
            browser: Arc::new(Mutex::new(browser)),
        })
    }

    pub fn create_new_tab<'js>(&self, ctx: Ctx<'js>) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let ctx_clone = ctx.clone(); // Clone ctx here
        let browser = Arc::clone(&self.browser); // Clone Arc to share ownership
        ctx.spawn(async move {
            let browser = browser.lock().await; // Await the lock
            match browser.new_tab() {
                Ok(tab) => {
                    let tab_wrapper = TabWrapper {
                        tab: Arc::new(Mutex::new(tab)),
                    };
                    let tab_wrapper_value = tab_wrapper.into_js(&ctx_clone).unwrap();
                    let tab_wrapper_object: Object = tab_wrapper_value.into_object().unwrap();
                    resolve
                        .call::<(Object,), ()>((tab_wrapper_object,))
                        .unwrap();
                }
                Err(e) => reject.call::<(String,), ()>((e.to_string(),)).unwrap(),
            }
        });
        Ok(promise)
    }
}

#[rquickjs::methods]
impl TabWrapper {
    pub fn navigate_to<'js>(&self, ctx: Ctx<'js>, url: String) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let ctx_clone = ctx.clone(); // Clone ctx here
        let tab = Arc::clone(&self.tab); // Clone Arc to share ownership
        ctx.spawn(async move {
            let tab = tab.lock().await; // Await the lock
            if let Err(e) = tab.navigate_to(&url) {
                reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                return;
            }
            if let Err(e) = tab.wait_until_navigated() {
                reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                return;
            }
            let tab_wrapper = TabWrapper {
                tab: Arc::new(Mutex::new(Arc::clone(&tab))),
            };
            let tab_wrapper_value = tab_wrapper.into_js(&ctx_clone).unwrap();
            let tab_wrapper_object: Object = tab_wrapper_value.into_object().unwrap();
            resolve
                .call::<(Object,), ()>((tab_wrapper_object,))
                .unwrap();
        });
        Ok(promise)
    }

    pub fn get_content<'js>(&self, ctx: Ctx<'js>) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let tab = Arc::clone(&self.tab); // Clone Arc to share ownership
        ctx.spawn(async move {
            let tab = tab.lock().await; // Await the lock
            match tab.get_content() {
                Ok(content) => {
                    resolve.call::<(String,), ()>((content,)).unwrap();
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
              try {
                const browser = new HeadlessChrome('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
                console.log("Browser created", browser);
                // const browser = new HeadlessChrome(null);
                 const tab = await browser.create_new_tab();
                 console.log("tab:", tab);
                const tabWrapper = await tab.navigate_to('https://example.com');
                const content = await tabWrapper.get_content();
                return { data: `Hello, ${params.name}! Content: ${content}` };
              } catch (error) {
                return { error: error.message };
              }
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
