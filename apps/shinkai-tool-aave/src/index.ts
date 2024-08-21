import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import * as playwright from 'playwright';
import * as chromePaths from 'chrome-paths';
import { createWalletClient, http, parseEther } from 'viem';

// Remove later. It's for debugging.
import * as fs from 'fs';
import * as path from 'path';

type Config = {};
type Params = {
  url: string;
};
type Result = {
  assetsToSupply: { asset: string; apy: string }[];
  assetsToBorrow: { asset: string; apy: string }[];
};

// Extend the Window interface to include ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-playwright-example',
    name: 'Shinkai: Aave Market Extractor',
    description:
      'Tool for extracting Aave market data including assets to supply and borrow with their APYs',
    author: 'Shinkai',
    keywords: ['aave', 'market', 'extractor', 'shinkai'],
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
        assetsToSupply: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              asset: { type: 'string' },
              apy: { type: 'string' },
            },
            required: ['asset', 'apy'],
          },
        },
        assetsToBorrow: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              asset: { type: 'string' },
              apy: { type: 'string' },
            },
            required: ['asset', 'apy'],
          },
        },
      },
      required: ['assetsToSupply', 'assetsToBorrow'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    const browser = await playwright['chromium'].launch({
      executablePath: chromePaths.chrome,
      headless: false,
    });
    const context = await browser.newContext();

    const page = await context.newPage();
    await page.goto(params.url);

    const viemPath = path.join(__dirname, 'bundled-resources/shinkai-viem.js');
    if (!fs.existsSync(viemPath)) {
      throw new Error(`Viem bundle not found at path: ${viemPath}`);
    }

    // Read the content of viem-bundle.js
    const viemScriptContent = fs.readFileSync(viemPath, 'utf8');
    console.log('Viem script loaded');

    await page.evaluate((scriptContent) => {
      const script = document.createElement('script');
      script.textContent = scriptContent;
      document.head.appendChild(script);
      console.log('Viem script injected');
    }, viemScriptContent);

    // // Inject the wallet setup script
    // await page.evaluate(() => {
    //   const {
    //     createWalletClient,
    //     http,
    //     parseEther,
    //     privateKeyToAccount,
    //     mainnet,
    //   } = (window as any).viem;

    //   const client = createWalletClient({
    //     chain: mainnet,
    //     transport: http(),
    //   });

    //   console.log('Viem client created');
    //   const account = privateKeyToAccount('your-private-key-here'); // Replace with your actual private key

    //   // Expose the client and account to the window object
    //   (window as any).viemClient = client;
    //   (window as any).viemAccount = account;

    //   console.log('Viem wallet client and account injected');
    // });

    // Click the "Opt-out" button
    // Wait for the "Opt-out" button to appear and click it
    await page.waitForSelector('#rcc-decline-button > p');
    await page.click('#rcc-decline-button > p');

    // Click the wallet button
    await page.waitForSelector('#wallet-button');
    await page.click('#wallet-button');

    // Click the "Browser wallet" button
    const browserWalletButton = page.locator(
      'body > div:nth-child(20) > div[class*="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation1"] > div[class*="MuiBox-root"] > button:nth-child(2)',
    );

    await browserWalletButton.waitFor({ state: 'visible' });
    console.log('Browser wallet button is visible');
    await browserWalletButton.click();

    // Find the div with data-cy="dashboardSupplyListItem_ETH" and click the first button inside the 5th internal div
    const ethSupplyListItem = page.locator(
      'div[data-cy="dashboardSupplyListItem_ETH"]',
    );
    const buttonInFifthDiv = ethSupplyListItem
      .locator('div:nth-child(5) button')
      .first();
    await buttonInFifthDiv.waitFor({ state: 'visible' });
    await buttonInFifthDiv.click();
    console.log('First button inside the 5th internal div clicked');

    // Input a value of 0.1 into the specified input field
    const inputField = page.locator(
      'div.MuiModal-root div.MuiPaper-root div.MuiBox-root div.MuiBox-root div.MuiBox-root div.MuiInputBase-root input',
    );
    await inputField.waitFor({ state: 'visible' });
    await inputField.fill('0.005');
    console.log('Input field filled with value 0.1');

    // Click the button with data-cy="actionButton"
    const actionButton = page.locator('button[data-cy="actionButton"]');
    await actionButton.waitFor({ state: 'visible' });
    await actionButton.click();
    console.log('Action button clicked');

    // Wait for the specified selector with a more flexible approach
    await page.waitForSelector(
      'body > div.MuiModal-root > div.MuiPaper-root.MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation1 > div.MuiBox-root > h2',
    );

    // Take a screenshot and save it to ./tmp/
    const screenshotPath = path.join(__dirname, 'tmp', 'screenshot.png');
    await page.screenshot({ path: screenshotPath });

    await browser.close();
    return Promise.resolve({
      data: { assetsToSupply: [], assetsToBorrow: [] },
    });
  }
}
