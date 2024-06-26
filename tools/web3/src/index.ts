import { BaseTool } from "@shinkai_protocol/tool";
import { ethers } from "ethers";

type Config = {};

type Params = {
  address: string;
};

type Result = string;

export class Tool extends BaseTool<Config, Params, Result> {
  async run(params: Params): Promise<string> {
    console.log("Running tool");
    const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com", 1);
    // return "Hello, world!";
    console.log("Provider created");

    try {
      const balance = await provider.getBalance(params.address);
      console.log("Balance: ", balance);
      const balanceInEth = ethers.formatEther(balance);
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
