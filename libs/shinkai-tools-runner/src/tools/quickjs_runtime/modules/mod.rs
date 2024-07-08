use rquickjs::{Ctx, Module, Result};

mod shinkai_utils;

use self::shinkai_utils::js_shinkai_utils;


pub fn init_modules(ctx: &Ctx<'_>) -> Result<()> {
    // Module::evaluate(ctx.clone(), "shinkai/utils", js_shinkai_utils).unwrap();
    let a = Module::declare_def::<js_shinkai_utils, _>(ctx.clone(), "test").unwrap();
    a.eval().unwrap();
    Ok(())
}