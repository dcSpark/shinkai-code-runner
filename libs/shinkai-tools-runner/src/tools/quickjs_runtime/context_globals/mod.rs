use rquickjs::{Ctx, Result};
use llrt_core::modules::http;
use llrt_core::modules::console;

// mod console;
mod fetch;
mod timers;
mod text_encoder;
mod text_decoder;
mod utils;
mod chrome;

pub fn init_globals(ctx: &Ctx<'_>) -> Result<()> {
    console::init(ctx)?;
    fetch::init(ctx)?;
    timers::init(ctx)?;
    text_encoder::init(ctx)?;
    text_decoder::init(ctx)?;
    http::init(ctx)?;
    chrome::init(ctx)?;
    Ok(())
}
