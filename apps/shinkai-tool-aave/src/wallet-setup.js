// wallet-setup.js
(async () => {
  const { createWalletClient, http, parseEther } = await import('https://cdn.jsdelivr.net/npm/viem@latest/dist/viem.min.js');
  const { privateKeyToAccount } = await import('https://cdn.jsdelivr.net/npm/viem@latest/dist/accounts.min.js');
  const { mainnet } = await import('https://cdn.jsdelivr.net/npm/viem@latest/dist/chains.min.js');

  const client = createWalletClient({
    chain: mainnet,
    transport: http()
  });

  const account = privateKeyToAccount('your-private-key-here'); // Replace with your actual private key

  // Expose the client and account to the window object
  window.viemClient = client;
  window.viemAccount = account;

  console.log('Viem wallet client and account injected');
})();
