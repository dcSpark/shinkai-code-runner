use reqwest::{
    self,
    header::{HeaderMap, HeaderName, HeaderValue},
    Method,
};
use rquickjs::function::Opt;
use rquickjs::{function::Func, Ctx, Object, Promise, Result};
use std::collections::HashMap;
use std::str::FromStr;

fn fetch<'js>(ctx: Ctx<'js>, url: String, options: Opt<Object<'js>>) -> Result<Promise<'js>> {
    let (promise, resolve, reject) = ctx.promise()?;
    let ctx_clone = ctx.clone();
    let options = if options.0.is_some() {
        options.0.unwrap()
    } else {
        Object::new(ctx.clone()).unwrap()
    };
    ctx.spawn(async move {
        let method = options
            .get::<String, String>("method".to_string())
            .unwrap_or_else(|_| "GET".to_string());
        let headers = options.get::<String, Object>("headers".to_string());
        let body = match options.get::<String, Object>("body".to_string()) {
            Ok(body_object) => {
                let body_string = ctx_clone.json_stringify(body_object).unwrap().unwrap();
                Some(body_string.to_string().unwrap())
            }
            Err(_) => match options.get::<String, String>("body".to_string()) {
                Ok(body_string) => Some(body_string),
                Err(_) => None,
            },
        };

        let client = reqwest::Client::new();
        let mut request = client.request(Method::from_str(method.as_str()).unwrap(), url);
        let mut header_map = HeaderMap::new();
        if let Ok(headers_object) = headers {
            headers_object.props::<String, String>().for_each(|kv| {
                if let Ok((key, value)) = kv {
                    if let Ok(header_value) = HeaderValue::from_str(&value) {
                        if let Ok(header_name) = HeaderName::from_str(&key) {
                            header_map.insert(header_name, header_value);
                        }
                    }
                }
            });
        }
        request = request.headers(header_map);
        if let Some(body_string) = body {
            request = request.body(body_string);
        }
        match request.send().await {
            Ok(response) => {
                // let status = response.status().as_str().into_js(&ctx_clone);
                let mut headers = HashMap::<String, String>::new();
                response.headers().iter().for_each(|(key, value)| {
                    let value = value.to_str().unwrap().to_string();
                    headers.insert(key.as_str().to_string(), value);
                });

                let ok = response.status().is_success();
                let status = response.status().as_u16();
                let status_text = response.status().as_str().to_string();
                let body = response.bytes().await.ok().map(|b| b.to_vec()).unwrap();
                let body_clone = body.clone();
                let body_clone2 = body.clone();

                let response_to_js = Object::new(ctx_clone.clone()).unwrap();

                response_to_js.set("status", status).unwrap();
                response_to_js.set("statusText", status_text).unwrap();
                response_to_js.set("ok", ok).unwrap();
                response_to_js.set("headers", headers.clone()).unwrap();
                response_to_js.set("body", body).unwrap();
                response_to_js
                    .set(
                        "json",
                        Func::new(move || {
                            let body_string = String::from_utf8_lossy(&body_clone);
                            let json_value = ctx_clone.clone().json_parse(&*body_string).unwrap();
                            Ok::<_, rquickjs::Error>(json_value)
                        }),
                    )
                    .unwrap();

                response_to_js
                    .set(
                        "text",
                        Func::new(move || {
                            let body_string = String::from_utf8_lossy(&body_clone2);
                            Ok::<_, rquickjs::Error>(body_string.to_string())
                        }),
                    )
                    .unwrap();

                resolve.call::<(_,), ()>((response_to_js,)).unwrap();
            }
            Err(error) => {
                reject.call::<_, ()>((error.to_string(),)).unwrap();
            }
        }
    });
    Ok(promise)
}

pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();
    let _ = globals.set("fetch", Func::from(fetch));
    Ok(())
}
