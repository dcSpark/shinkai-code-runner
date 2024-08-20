import * as viem from 'viem';
import * as chains from 'viem/chains';
import { createWalletClient, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Assign to window object
(window as any).viem = viem;
(window as any).chains = chains;

// EIP-1193 Provider Implementation
class ViemProvider {
  client: any;
  selectedAddress: string | null;

  constructor(chain: any, sk: viem.Hex | null) {
    const privateKey: viem.Hex = sk || '0xf4c1c6d9231a5f08aa8d9824a142c4fc5a663ca1a6ecd61126e54a0d7501df82';
    const account = privateKeyToAccount(privateKey);

    this.client = createWalletClient({
      account,
      chain: chain || chains.arbitrumSepolia,
      transport: viem.http(),
    });
    this.selectedAddress = this.client.getAddresses()[0];
  }

  async enable() {
    return this.requestAccounts();
  }

  async request({ method, params }: { method: string; params: any[] }) {
    console.log('request', method, params);
    switch (method) {
      case 'eth_requestAccounts':
        return this.requestAccounts();
      case 'eth_accounts':
        return this.getAccounts();
      case 'eth_sendTransaction':
        return this.sendTransaction(params[0]);
      case 'eth_sign':
        return this.sign(params[0], params[1]);
      case 'personal_sign':
        return this.personalSign(params[0], params[1]);
      case 'eth_signTypedData':
        return this.signTypedData(params[0], params[1]);
      case 'eth_chainId':
        return this.getChainId();
      case 'net_version':
        return this.getNetworkId();
      // Add more methods as needed
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  async requestAccounts() {
    const [address] = await this.client.getAddresses();
    this.selectedAddress = address;
    return [address];
  }

  async getAccounts() {
    return this.selectedAddress ? [this.selectedAddress] : [];
  }

  async sendTransaction(tx: any) {
    if (!this.selectedAddress) {
      throw new Error('No accounts available');
    }
    const hash = await this.client.sendTransaction({
      account: this.selectedAddress,
      to: tx.to,
      value: parseEther(tx.value),
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      data: tx.data,
    });
    return hash;
  }

  async sign(address: string, message: string) {
    if (address !== this.selectedAddress) {
      throw new Error('Address mismatch');
    }
    return this.client.signMessage({ account: address, message });
  }

  async personalSign(message: string, address: string) {
    if (address !== this.selectedAddress) {
      throw new Error('Address mismatch');
    }
    return this.client.signMessage({ account: address, message });
  }

  async signTypedData(address: string, typedData: any) {
    if (address !== this.selectedAddress) {
      throw new Error('Address mismatch');
    }
    return this.client.signTypedData({ account: address, typedData });
  }

  async getChainId() {
    return this.client.getChainId();
  }

  async getNetworkId() {
    const chainId = await this.getChainId();
    return chainId.toString();
  }
}

// EIP-6963 Interfaces
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any; // EIP1193 window.ethereum injected provider
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

// Function to announce the provider
function addEip6963Listener(info: EIP6963ProviderInfo, provider: ViemProvider) {
  const announceEvent = new CustomEvent<EIP6963ProviderDetail>(
    'eip6963:announceProvider',
    {
      detail: Object.freeze({ info, provider }),
    },
  ) as EIP6963AnnounceProviderEvent;

  // Send an event for any dApp that was already listening to let them know about the provider
  window.dispatchEvent(announceEvent);

  // Create a listener to respond to any dApp with provider info
  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(announceEvent);
  });
}

// Function to initialize and assign the provider to window.ethereum
function initializeViemProvider(chain: any, providerInfo: EIP6963ProviderInfo) {
  const provider = new ViemProvider(chain, null); // TODO: remove null

  (window as any).ethereum = {
    request: provider.request.bind(provider),
    enable: provider.enable.bind(provider),
    on: (eventName: string, callback: (...args: any[]) => void) => {
      // Implement event listeners if needed
      console.log(`Event listener for ${eventName} added.`);
    },
    removeListener: (eventName: string, callback: (...args: any[]) => void) => {
      // Implement event removal if needed
      console.log(`Event listener for ${eventName} removed.`);
    },
    isConnected: () => {
      // Implement connection check if needed
      return true;
    },
    send: (method: string, params: any[]) => {
      // Legacy method, should use request instead
      console.warn('send is deprecated. Use request instead.');
      return provider.request({ method, params });
    },
    sendAsync: (payload: any, callback: (error: any, response: any) => void) => {
      // Legacy method, should use request instead
      console.warn('sendAsync is deprecated. Use request instead.');
      provider.request({ method: payload.method, params: payload.params })
        .then((result) => callback(null, { result }))
        .catch((error) => callback(error, null));
    },
    isMetaMask: true, // Set to true if mimicking MetaMask
    selectedAddress: provider.selectedAddress,
    chainId: chain?.id || '0x1', // Default to mainnet if chain is not provided
  };

  addEip6963Listener(providerInfo, provider);
  console.log('Viem provider initialized');
}

// Example provider info
const viemProviderInfo: EIP6963ProviderInfo = {
  uuid: 'd69bc4c4-e43a-4d0a-83d7-b6e7b7504beb',
  name: 'Shinkai Viem Provider',
  icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzY3IiBoZWlnaHQ9IjM2NyIgdmlld0JveD0iMCAwIDM2NyAzNjciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjE4My41IiBjeT0iMTgzLjUiIHI9IjE4My41IiBmaWxsPSIjRkU2MTYyIi8+CjxwYXRoIGQ9Ik0yNzIuMjk1IDI3NC42NjhDMjcwLjc1OCAyNjguOTc1IDI2Ni42MTkgMjY2LjIxNSAyNjAuODQ0IDI2Ni43NzlDMjQ5LjY2NCAyNjcuODYzIDI0NS45NTIgMjY0LjI3OSAyNDAuNjQ2IDI1Ni40MDRDMjU0LjYyOCAyNTkuMzY3IDI2My42NDYgMjU1LjcyNSAyNjYuNDYzIDI1NC4xMDdDMjcwLjA5IDI1Mi4wMTIgMjczLjc2IDI0OS4zMjQgMjcyLjMwOSAyNDQuNTg1QzI3MC44ODYgMjM5Ljk0NyAyNjYuNjE5IDIzOS4wMjIgMjYyLjIzOCAyMzkuODZDMjU2LjAyMiAyNDEuMDQ1IDI1MC4wNjIgMjQxLjczOCAyNDUuMjI2IDIzNS42ODRDMjQ2LjI1IDIzNC43NTkgMjQ3LjI3NCAyMzMuODA2IDI0OC4zMjcgMjMyLjg5NUMyNTAuOTAyIDIzMC42ODUgMjUyLjg5MyAyMjguMDg0IDI1MS41ODQgMjI0LjU3M0MyNTAuMzMzIDIyMS4yMiAyNDcuMTYxIDIxOS4yOTkgMjQzLjkzMiAyMTkuODkxQzI0MS4zIDIyMC4zODIgMjM2LjAyMyAyMjIuMDMgMjM0LjQxNiAyMTkuMzQyTDIzNC40ODcgMjE5LjMxM0MyMzMuODc1IDIxOS4xNjkgMjMyLjkzNyAyMTYuNjU0IDIzMi43MzcgMjE0LjgxOUMyMzEuNzk5IDIwNS44NDYgMjM1LjY4MiAxOTcuMjM1IDI0MC45MTYgMTkwLjA4MkMyNDcuNDQ1IDE4MS4xOTYgMjUxLjkyNiAxNzEuMzk5IDI1My45MTcgMTYwLjUzM0MyNTcuMDMyIDE0My40ODMgMjUzLjczMiAxMjcuNjE4IDI0NC41MTUgMTEzLjAzOUMyMzMuNTc3IDk1LjcyODMgMjE4LjE1OCA4NC4zMjc4IDE5Ny44NiA4MC4xMzc1QzE5My4wOTUgNzkuMTU1IDE4OC40NDQgNzguNjM0OCAxODMuOTM1IDc4LjU0ODFDMTc5LjQxMSA3OC42MzQ4IDE3NC43NzQgNzkuMTU1IDE3MC4wMDkgODAuMTM3NUMxNDkuNzI2IDg0LjMyNzggMTM0LjI5MyA5NS43MjgzIDEyMy4zNTQgMTEzLjAzOUMxMTQuMTUxIDEyNy42MTggMTEwLjg1MSAxNDMuNDgzIDExMy45NTIgMTYwLjUzM0MxMTUuOTI5IDE3MS40MTQgMTIwLjQyNCAxODEuMTk2IDEyNi45NTMgMTkwLjA4MkMxMzIuMjAyIDE5Ny4yMzUgMTM2LjA4NSAyMDUuODMyIDEzNS4xMzIgMjE0LjgxOUMxMzQuOTMzIDIxNi42NTQgMTMzLjk5NCAyMTkuMTY5IDEzMy4zODIgMjE5LjMxM0wxMzMuNDUzIDIxOS4zNDJDMTMxLjg0NiAyMjIuMDE1IDEyNi41ODMgMjIwLjM4MiAxMjMuOTM4IDIxOS44OTFDMTIwLjcyMyAyMTkuMjk5IDExNy41MzcgMjIxLjIyIDExNi4yODUgMjI0LjU3M0MxMTQuOTc2IDIyOC4wODQgMTE2Ljk1NCAyMzAuNjg1IDExOS41NDIgMjMyLjg5NUMxMjAuNTk1IDIzMy44MDYgMTIxLjYxOSAyMzQuNzU5IDEyMi42NDMgMjM1LjY4NEMxMTcuODA3IDI0MS43MzggMTExLjgzMyAyNDEuMDQ1IDEwNS42MzEgMjM5Ljg2QzEwMS4yNSAyMzkuMDIyIDk2Ljk4MjkgMjM5Ljk0NyA5NS41NjA1IDI0NC41ODVDOTQuMTA5NyAyNDkuMzI0IDk3Ljc3OTUgMjUyLjAxMiAxMDEuNDA3IDI1NC4xMDdDMTA0LjIwOSAyNTUuNzI1IDExMy4yNDEgMjU5LjM1MiAxMjcuMjIzIDI1Ni40MDRDMTIxLjkxOCAyNjQuMjc5IDExOC4yMDUgMjY3Ljg2MyAxMDcuMDI1IDI2Ni43NzlDMTAxLjI1IDI2Ni4yMTUgOTcuMDk2NyAyNjguOTc1IDk1LjU3NDcgMjc0LjY2OEM5NC4wODEyIDI4MC4yMzEgOTcuMDI1NiAyODQuMjE5IDEwMS42OTEgMjg2Ljg3OEMxMDQuNzQ5IDI4OC42MTIgMTA4LjE2MyAyODkuMjkxIDExMS43NzYgMjg5LjM0OUMxMzEuNTYyIDI4OS42MjMgMTQ3Ljg5MSAyODEuNDU5IDE2Mi41OTkgMjY5LjE3OEMxNzAuNjkyIDI2Mi40MTUgMTc3LjM0OSAyNTguOTkxIDE4My45NDkgMjU4LjkwNEMxOTAuNTQ5IDI1OC45OTEgMTk3LjE5MSAyNjIuNDE1IDIwNS4yOTkgMjY5LjE3OEMyMjAuMDA3IDI4MS40NTkgMjM2LjMzNiAyODkuNjIzIDI1Ni4xMjIgMjg5LjM0OUMyNTkuNzM1IDI4OS4zMDUgMjYzLjE0OCAyODguNjEyIDI2Ni4yMDcgMjg2Ljg3OEMyNzAuODg2IDI4NC4yMTkgMjczLjgxNyAyODAuMjMxIDI3Mi4zMjMgMjc0LjY2OEgyNzIuMjk1Wk0xNTYuNjI0IDIwNy4yNjJDMTUwLjUwOCAyMDcuMjQ4IDE0NS40NTkgMjAyLjEzMyAxNDUuNDQ0IDE5NS45NjNDMTQ1LjQ0NCAxODkuNjc4IDE1MC41NTEgMTg0LjUzNCAxNTYuODUyIDE4NC40NzZDMTYyLjg0IDE4NC40MTggMTY4LjE3NCAxOTAuMDk3IDE2OC4xMTcgMTk2LjQ2OUMxNjguMDYxIDIwMi43ODMgMTYzLjI1MyAyMDcuMjkxIDE1Ni42MjQgMjA3LjI2MlpNMjExLjIzMSAyMDcuMjYyQzIwNC41ODggMjA3LjI5MSAxOTkuNzk1IDIwMi43NjkgMTk5LjczOCAxOTYuNDY5QzE5OS42ODEgMTkwLjA5NyAyMDUuMDI5IDE4NC40MTggMjExLjAwMyAxODQuNDc2QzIxNy4zMDQgMTg0LjU0OCAyMjIuNDExIDE4OS42OTIgMjIyLjQxMSAxOTUuOTYzQzIyMi40MTEgMjAyLjEzMyAyMTcuMzQ3IDIwNy4yNDggMjExLjIzMSAyMDcuMjYyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==', // Base64 encoded icon
  rdns: 'com.shinkai.desktop',
};

// Initialize the provider for Arbitrum Sepolia by default
initializeViemProvider(chains.arbitrumSepolia, viemProviderInfo);

// Optionally export them if you want to access them later
export { viem, chains, ViemProvider, initializeViemProvider, viemProviderInfo };
