import { BaseTool } from "@shinkai_protocol/tool";
import { addr, weieth } from 'micro-eth-signer';
import { ArchiveNodeProvider } from 'micro-eth-signer/net';

type Config = {};

type Params = {
  address: string;
};

type Result = string;

export class Tool extends BaseTool<Config, Params, Result> {
  async run(params: Params): Promise<string> {
    // console.log("Running tool");
    const provider = new ArchiveNodeProvider({
      call: async (method: string, ...args: any[]) => {
        // console.log("Calling: " + method);
        // console.log("Args: " + args.join(', '));
        const response = await fetch("https://eth.llamarpc.com", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params: args,
          }),
        });
        // console.log("Response: " + response);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // console.log("Data: ", data);
        if (data.error) {
          throw new Error(data.error.message);
        }

        return data.result;
      }
    });
    console.log("Provider created");

    try {
      const { balance } = await provider.unspent(params.address);
      const balanceInEth = weieth.encode(balance);
      return `Balance of ${params.address}: ${balanceInEth} ETH`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error: ${error.message}`;
      } else {
        return `An unknown error occurred`;
      }
    }
  }
}