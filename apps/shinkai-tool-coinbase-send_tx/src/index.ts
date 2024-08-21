import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { Coinbase, CoinbaseOptions } from '@coinbase/coinbase-sdk';

type Config = {
  name: string;
  privateKey: string;
  walletId?: string;
};
type Params = {
  walletId?: string;
  recipient_address: string;
  assetId: string;
  amount: string;
};
type Result = {
  data: string;
};

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-coinbase-send_tx',
    name: 'Shinkai: Coinbase Transaction Sender',
    description:
      'Tool for restoring a Coinbase wallet and sending a transaction',
    author: 'Shinkai',
    keywords: ['coinbase', 'transaction', 'shinkai'],
    configurations: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        privateKey: { type: 'string' },
        walletId: { type: 'string', nullable: true },
      },
      required: ['name', 'privateKey'],
    },
    parameters: {
      type: 'object',
      properties: {
        walletId: { type: 'string', nullable: true },
        recipient_address: { type: 'string' },
        assetId: { type: 'string' },
        amount: { type: 'string' },
      },
      required: ['recipient_address', 'assetId', 'amount'],
    },
    result: {
      type: 'object',
      properties: {
        data: { type: 'string' },
      },
      required: ['data'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    // Coinbase wallet creation using constructor
    const coinbaseOptions: CoinbaseOptions = {
      apiKeyName: this.config.name,
      privateKey: this.config.privateKey,
      useServerSigner: false,
      debugging: false,
      basePath: '',
      maxNetworkRetries: 3,
    };
    const coinbase = new Coinbase(coinbaseOptions);
    console.log(`Coinbase configured: `, coinbase);
    const user = await coinbase.getDefaultUser();
    console.log(`User: `, user);

    // Prioritize walletId from Params over Config
    const walletId = params.walletId || this.config.walletId;

    let wallet;
    if (walletId) {
      // Retrieve existing Wallet using walletId
      wallet = await user.getWallet(walletId);
      console.log(`Wallet retrieved: `, wallet.toString());
    } else {
      // Create a new Wallet for the User
      wallet = await user.createWallet({
        networkId: Coinbase.networks.BaseSepolia,
      });
      console.log(`Wallet successfully created: `, wallet.toString());
    }

    // Retrieve the list of balances for the wallet
    let balances = await wallet.listBalances();
    console.log(`Balances: `, balances);

    // If no balances, call the faucet and then list balances again
    if (balances.size === 0) {
      const faucetTransaction = await wallet.faucet();
      console.log(
        `Faucet transaction completed successfully: `,
        faucetTransaction.toString(),
      );

      // Retrieve the list of balances again
      balances = await wallet.listBalances();
      console.log(`Balances after faucet: `, balances);
    }

    // Convert amount from string to number
    const amount = parseFloat(params.amount);
    if (isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }

    // Create and send the transfer
    const transfer = await wallet.createTransfer({
      amount,
      assetId: params.assetId,
      destination: params.recipient_address,
      timeoutSeconds: 60,
      intervalSeconds: 5,
      gasless: false,
    });
    console.log(`Transfer completed successfully: `, transfer.toString());

    return {
      data: {
        data: `Transfer completed successfully: ${transfer.toString()}`,
      },
    };
  }
}
