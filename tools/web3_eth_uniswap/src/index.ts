import { BaseTool } from "@shinkai_protocol/tool";
import { addr, weieth } from "micro-eth-signer";
import { tokenFromSymbol } from "micro-eth-signer/abi";
import { ArchiveNodeProvider, UniswapV3 } from "micro-eth-signer/net";
import { Token } from "micro-eth-signer/net/uniswap-common";

type Config = {};

type Params = {
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  slippagePercent: number;
};

type Result = string;

function getTokenFromSymbol(symbol: string): "eth" | Token {
  if (symbol.toLowerCase() === "eth") return "eth";
  const token = tokenFromSymbol(symbol);
  if (!token) throw new Error(`Unknown token symbol: ${symbol}`);
  return token as Token;
}

export class Tool extends BaseTool<Config, Params, Result> {
  async run(params: Params): Promise<string> {
    // console.log("Running tool");
    const provider = new ArchiveNodeProvider({
      call: async (method: string, ...args: any[]) => {
        // console.log("Calling: " + method);
        // console.log("Args: " + JSON.stringify(args, null, 2));
        const response = await fetch("https://eth.llamarpc.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
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
        // console.log("Data: " + data);
        if (data.error) {
          throw new Error(data.error.message);
        }

        return data.result;
      },
    });
    // console.log("Provider created");

    try {
      const fromToken = getTokenFromSymbol(params.fromToken);
      const toToken = getTokenFromSymbol(params.toToken);
      const u3 = new UniswapV3(provider);

      const swap = await u3.swap(fromToken, toToken, params.amount, {
        slippagePercent: params.slippagePercent,
        ttl: 30 * 60,
      });

      if (!swap) {
        return "Swap operation failed: Unable to create swap";
      }

      const swapData = await swap.tx(params.fromAddress, params.toAddress);
      // console.log("swapData: " + JSON.stringify(swapData, null, 2));

      // Return all swapData as a JSON string
      return JSON.stringify(
        {
          amount: swapData.amount,
          address: swapData.address,
          expectedAmount: swapData.expectedAmount,
          data: swapData.data,
          allowance: swapData.allowance || null,
        },
        null,
        2
      );
    } catch (error) {
      if (error instanceof Error) {
        return `Error: ${error.message}`;
      } else {
        return `An unknown error occurred`;
      }
    }
  }
}
