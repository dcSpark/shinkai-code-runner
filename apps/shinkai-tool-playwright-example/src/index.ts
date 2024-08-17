import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import * as playwright from 'playwright';

type Config = {};
type Params = {
  url: string;
};
type Result = { message: string };
export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-playwright-example',
    name: 'Shinkai: playwright-example',
    description: 'New playwright-example tool from template',
    author: 'Shinkai',
    keywords: ['playwright-example', 'shinkai'],
    configurations: {
      type: 'object',
      properties: {},
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
    },
    result: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    const browser = await playwright['chromium'].launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(params.url);
    await page.screenshot({
      path: `nodejs_${'chromium'}.png`,
      fullPage: true,
    });
    await page.waitForTimeout(1000);
    await browser.close();
    return Promise.resolve({ data: { message: 'ok' } });
  }
}
