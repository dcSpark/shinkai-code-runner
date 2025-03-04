import { weieth } from 'npm:micro-eth-signer@0.10.0';
import { ArchiveNodeProvider } from 'npm:micro-eth-signer@0.10.0/net';
import axios from 'npm:axios';
import process from 'node:process';

type Configurations = {};

type Parameters = {
  address: string;
};

type Result = { balance: string };

export const run: Run<Configurations, Parameters, Result> = async (
  _configurations,
  params,
): Promise<Result> => {
  const provider = new ArchiveNodeProvider({
    call: async (method: string, ...args: any[]) => {
      try {
        await process.nextTick(() => {});
        const response = await axios.post(
          'https://eth.llamarpc.com',
          {
            jsonrpc: '2.0',
            id: 1,
            method,
            params: args,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (response.data.error) {
          throw new Error(response.data.error.message);
        }

        return response.data.result;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`HTTP error! status: ${error.response?.status}`);
        }
        throw error;
      }
    },
  });
  console.log('Provider created');

  try {
    const { balance } = await provider.unspent(params.address);
    const balanceInEth = weieth.encode(balance);
    return {
      balance: `Balance of ${params.address}: ${balanceInEth} ETH`,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { balance: `Error: ${error.message}` };
    } else {
      return { balance: `An unknown error occurred` };
    }
  }
};

export const definition: ToolDefinition<typeof run> = {
  id: 'shinkai-tool-web3-eth-balance',
  name: 'Shinkai: Web3 ETH Balance',
  description: 'Fetches the balance of an Ethereum address in ETH.',
  author: 'Shinkai',
  keywords: ['ethereum', 'balance', 'web3', 'shinkai'],
  configurations: {
    type: 'object',
    properties: {},
    required: [],
  },
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string' },
    },
    required: ['address'],
  },
  result: {
    type: 'object',
    properties: {
      balance: { type: 'string' },
    },
    required: ['balance'],
  },
};
