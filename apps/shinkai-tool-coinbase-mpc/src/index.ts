import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { Coinbase } from "@coinbase/coinbase-sdk";

type Config = {};
type Params = {
  walletId?: string;
};
type Result = {
  data: string; // Result is now an object with a data property
};

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-coinbase-mpc',
    name: 'Shinkai: Coinbase MPC Extractor',
    description: 'Tool for extracting Coinbase MPC data including assets to supply and borrow with their APYs',
    author: 'Shinkai',
    keywords: ['coinbase', 'mpc', 'extractor', 'shinkai'],
    configurations: {
      type: 'object',
      properties: {},
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', nullable: true }, // Add walletId to parameters
      },
      required: [], // No required parameters
    },
    result: {
      type: 'object',
      properties: {
        data: { type: 'string' }, // Result is now an object with a data property
      },
      required: ['data'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    // Coinbase wallet creation
    const coinbase = Coinbase.configureFromJson({ filePath: '~/Downloads/cdp_api_key.json' });
    console.log(`Coinbase configured: `, coinbase);
    const user = await coinbase.getDefaultUser();
    console.log(`User: `, user);

    let wallet;
    if (params.walletId) {
      // Retrieve existing Wallet using walletId
      wallet = await user.getWallet(params.walletId);
      console.log(`Wallet retrieved: `, wallet.toString());
    } else {
      // Create a new Wallet for the User
      wallet = await user.createWallet({ networkId: Coinbase.networks.BaseSepolia });
      console.log(`Wallet successfully created: `, wallet.toString());
    }

    // Wallets come with a single default Address, accessible via getDefaultAddress:
    const address = wallet.getDefaultAddress();
    if (address) {
      console.log(`Default address for the wallet: `, address.toString());
    } else {
      console.error('Failed to retrieve the default address for the wallet.');
    }

      // Retrieve the list of balances for the wallet
  let balances = await wallet.listBalances();
  console.log(`Balances: `, balances);

   // If no balances, call the faucet and then list balances again
   if (balances.size === 0) {
    const faucetTransaction = await wallet.faucet();
    console.log(`Faucet transaction completed successfully: `, faucetTransaction.toString());

    // Retrieve the list of balances again
    balances = await wallet.listBalances();
    console.log(`Balances after faucet: `, balances);
  }

    return { data: { data: 'Operation completed successfully' } };
  }
}
