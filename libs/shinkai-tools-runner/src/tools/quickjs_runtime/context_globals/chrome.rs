use base64::engine::general_purpose;
use base64::Engine;
use headless_chrome::protocol::cdp::Page::{self};
use headless_chrome::{Browser, LaunchOptionsBuilder, Tab};
use rquickjs::{class::Trace, Class, Ctx, Object, Promise, Result};
use rquickjs::{IntoJs, Value};
use std::{io, sync::Arc};
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

    pub fn wait_until_navigated<'js>(&self, ctx: Ctx<'js>) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let ctx_clone = ctx.clone(); // Clone ctx here
        let tab = Arc::clone(&self.tab); // Clone Arc to share ownership
        ctx.spawn(async move {
            let tab = tab.lock().await; // Await the lock
            match tab.wait_until_navigated() {
                Ok(_) => {
                    let tab_wrapper = TabWrapper {
                        tab: Arc::new(Mutex::new(Arc::clone(&tab))),
                    };
                    let tab_wrapper_value = tab_wrapper.into_js(&ctx_clone).unwrap();
                    let tab_wrapper_object: Object = tab_wrapper_value.into_object().unwrap();
                    resolve
                        .call::<(Object,), ()>((tab_wrapper_object,))
                        .unwrap();
                }
                Err(e) => {
                    reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                }
            }
        });
        Ok(promise)
    }

    pub fn capture_screenshot<'js>(
        &self,
        ctx: Ctx<'js>,
        format: String,
        quality: Option<u32>,
        clip: Option<Object<'js>>,
        from_surface: bool,
    ) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let tab = Arc::clone(&self.tab); // Clone Arc to share ownership
        ctx.spawn(async move {
            let tab = tab.lock().await; // Await the lock
            let format = match format.as_str() {
                "jpeg" => headless_chrome::protocol::cdp::Page::CaptureScreenshotFormatOption::Jpeg,
                "png" => headless_chrome::protocol::cdp::Page::CaptureScreenshotFormatOption::Png,
                "webp" => headless_chrome::protocol::cdp::Page::CaptureScreenshotFormatOption::Webp,
                _ => {
                    reject
                        .call::<(String,), ()>(("Invalid format".to_string(),))
                        .unwrap();
                    return;
                }
            };
            let clip = clip.map(|obj| Page::Viewport {
                x: obj.get("x").unwrap_or(0.0),
                y: obj.get("y").unwrap_or(0.0),
                width: obj.get("width").unwrap_or(0.0),
                height: obj.get("height").unwrap_or(0.0),
                scale: obj.get("scale").unwrap_or(1.0),
            });
            match tab.capture_screenshot(format, quality, clip, from_surface) {
                Ok(data) => {
                    let base64_data = general_purpose::STANDARD.encode(data);
                    resolve.call::<(String,), ()>((base64_data,)).unwrap();
                }
                Err(e) => {
                    reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                }
            }
        });
        Ok(promise)
    }

    pub fn wait_for_element<'js>(&self, ctx: Ctx<'js>, selector: String) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let tab = Arc::clone(&self.tab);
        ctx.spawn(async move {
            let tab = tab.lock().await;
            match tab.wait_for_element(&selector) {
                Ok(_) => {
                    resolve.call::<(String,), ()>((selector,)).unwrap();
                }
                Err(e) => {
                    reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                }
            }
        });
        Ok(promise)
    }

    pub fn wait_for_xpath<'js>(&self, ctx: Ctx<'js>, selector: String) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let tab = Arc::clone(&self.tab);
        ctx.spawn(async move {
            let tab = tab.lock().await;
            match tab.wait_for_xpath(&selector) {
                Ok(_) => {
                    resolve.call::<(String,), ()>((selector,)).unwrap();
                }
                Err(e) => {
                    reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                }
            }
        });
        Ok(promise)
    }

    // TODO: it should actually return an ElementWrapper (needs to be created)
    pub fn wait_for_element_with_custom_timeout<'js>(
        &self,
        ctx: Ctx<'js>,
        selector: String,
        timeout: u64,
    ) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let tab = Arc::clone(&self.tab);
        ctx.spawn(async move {
            let tab = tab.lock().await;
            let duration = std::time::Duration::from_secs(timeout);
            match tab.wait_for_element_with_custom_timeout(&selector, duration) {
                Ok(_) => {
                    resolve.call::<(String,), ()>((selector,)).unwrap();
                }
                Err(e) => {
                    reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                }
            }
        });
        Ok(promise)
    }

    pub fn set_user_agent<'js>(
        &self,
        ctx: Ctx<'js>,
        user_agent: String,
        accept_language: Option<String>,
        platform: Option<String>,
    ) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let ctx_clone = ctx.clone(); // Clone ctx here
        let tab = Arc::clone(&self.tab); // Clone Arc to share ownership
        ctx.spawn(async move {
            let tab = tab.lock().await; // Await the lock
            match tab.set_user_agent(&user_agent, accept_language.as_deref(), platform.as_deref()) {
                Ok(_) => {
                    let tab_wrapper = TabWrapper {
                        tab: Arc::new(Mutex::new(Arc::clone(&tab))),
                    };
                    let tab_wrapper_value = tab_wrapper.into_js(&ctx_clone).unwrap();
                    let tab_wrapper_object: Object = tab_wrapper_value.into_object().unwrap();
                    resolve
                        .call::<(Object,), ()>((tab_wrapper_object,))
                        .unwrap();
                }
                Err(e) => {
                    reject.call::<(String,), ()>((e.to_string(),)).unwrap();
                }
            }
        });
        Ok(promise)
    }

    pub fn set_default_timeout<'js>(&self, ctx: Ctx<'js>, timeout: u64) -> Result<Promise<'js>> {
        let (promise, resolve, _reject) = ctx.promise()?;
        let ctx_clone = ctx.clone(); // Clone ctx here
        let tab = Arc::clone(&self.tab); // Clone Arc to share ownership
        ctx.spawn(async move {
            let tab = tab.lock().await; // Await the lock
            let duration = std::time::Duration::from_secs(timeout);
            tab.set_default_timeout(duration);
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

    pub fn evaluate_expression<'js>(
        &self,
        ctx: Ctx<'js>,
        expression: String,
        await_promise: bool,
    ) -> Result<Promise<'js>> {
        let (promise, resolve, reject) = ctx.promise()?;
        let ctx_clone = ctx.clone(); // Clone ctx here
        let tab = Arc::clone(&self.tab); // Clone Arc to share ownership
        ctx.spawn(async move {
            let tab = tab.lock().await; // Await the lock
            match tab.evaluate(&expression, await_promise) {
                Ok(result) => {
                    // Convert the result to a JSON string
                    let result_json = serde_json::to_string(&result).unwrap();
                    // Convert the JSON string to a rquickjs Value
                    let result_value: Value = ctx_clone.eval(&*result_json).unwrap(); // Use cloned ctx
                    resolve.call::<(Value,), ()>((result_value,)).unwrap();
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
                // console.log("Browser created", browser);
                // const browser = new HeadlessChrome(null);
                const tab = await browser.create_new_tab();
                // console.log("tab:", tab);
                const tabWrapper = await tab.navigate_to('https://example.com');
                await tabWrapper.wait_until_navigated();
                const content = await tabWrapper.get_content();

                   // Capture screenshot
                const screenshot = await tabWrapper.capture_screenshot('png', null, null, true);
                // console.log("Screenshot captured:", screenshot);

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

    #[tokio::test]
    async fn test_navigate_and_get_content() {
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
                const tab = await browser.create_new_tab();
                const tabWrapper = await tab.navigate_to('https://en.wikipedia.org/wiki/WebKit');
                await tabWrapper.wait_until_navigated();
                await tabWrapper.wait_for_element('#mw-content-text > div > table.infobox.vevent');
                const content = await tabWrapper.get_content();

                return { data: `Content: ${content}` };
              } catch (error) {
                return { error: error.message };
              }
            }
        }

        globalThis.tool = { Tool };
        "#;

        let mut tool = Tool::new();
        let _ = tool.load_from_code(js_code, "").await;
        let run_result = tool.run("{}", None).await.unwrap();
        let content = run_result.data.as_str().unwrap();
        assert!(content.contains("Origyn Web Browser for MorphOS"));
    }
}