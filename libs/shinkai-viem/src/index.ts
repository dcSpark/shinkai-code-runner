import * as viem from 'viem';
import * as chains from 'viem/chains';
import { createWalletClient, custom, parseEther } from 'viem';

// Assign to window object
(window as any).viem = viem;
(window as any).chains = chains;

// EIP-1193 Provider Implementation
class ViemProvider {
  client: any;
  selectedAddress: string | null;

  constructor(chain: any) {
    this.client = createWalletClient({
      chain: chain,
      transport: custom((window as any).ethereum),
    });
    this.selectedAddress = null;
  }

  async request({ method, params }: { method: string; params: any[] }) {
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
  const provider = new ViemProvider(chain);
  (window as any).ethereum = provider;
  addEip6963Listener(providerInfo, provider);
}

// Example provider info
const viemProviderInfo: EIP6963ProviderInfo = {
  uuid: 'your-unique-uuid',
  name: 'Viem Provider',
  icon: 'data:image/svg+xml;base64,...', // Base64 encoded icon
  rdns: 'com.yourdomain.viemprovider',
};

// Optionally export them if you want to access them later
export { viem, chains, ViemProvider, initializeViemProvider, viemProviderInfo };
