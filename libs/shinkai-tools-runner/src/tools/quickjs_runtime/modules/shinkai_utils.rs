#[rquickjs::module(rename_vars = "camelCase")]
pub mod shinkai_utils {
    use rquickjs::Ctx;
    use rquickjs::Result;

    #[rquickjs::function]
    pub fn html2markdown<'js>(_: Ctx<'js>, text: String) -> Result<String> {
        let markdown = markdown::to_html(&text);
        Ok(markdown)
    }

    #[qjs(declare)]
    pub fn declare(_declare: &rquickjs::module::Declarations) -> rquickjs::Result<()> {
        Ok(())
    }

    #[qjs(evaluate)]
    pub fn evaluate<'js>(
        _ctx: &Ctx<'js>,
        _exports: &rquickjs::module::Exports<'js>,
    ) -> rquickjs::Result<()> {
        Ok(())
    }
}

