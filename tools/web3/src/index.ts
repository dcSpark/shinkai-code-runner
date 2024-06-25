import { BaseTool } from "@shinkai_protocol/tool";
import { ethers } from "ethers";

type Config = {
  infuraProjectId: string;
};

type Params = {
  address: string;
};

type Result = string;

export class Tool extends BaseTool<Config, Params, Result> {
  async run(params: Params): Promise<string> {
    const provider = new ethers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${this.config.infuraProjectId}`
    );

    try {
      const balance = await provider.getBalance(params.address);
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
