import { Tool } from './index';

test('exists definition', async () => {
  // const tool = new Tool({});
  // const definition = tool.getDefinition();
  // expect(definition).toBeInstanceOf(Object);
});

test('run definition', async () => {
  const tool = new Tool({
    name: 'organizations/ac056a7d-ab7b-4b28-911b-943f180775e2/apiKeys/7f424682-7c8d-4071-9639-28d77e26735d',
    privateKey:
      '-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIPnAT4QcTw38jtlZgkXJPbaE1jxZikpqZgFl/ZqcNeVloAoGCCqGSM49\nAwEHoUQDQgAEg5tSSie6fcUExPiskPPYgG49efdF1a0fjXPi0Se4/wz7Av3pus74\nm6OaU/sPcMNTmjgq4lArBHHkNerbmC0ifA==\n-----END EC PRIVATE KEY-----\n',
    walletId: 'cf104f7c-fcda-4ffd-a02f-aad825ed0928',
    useServerSigner: 'true',
  });
  const run_result = await tool.run({
    recipient_address: '0x3c8cf6ea0461Cf3A5b45068524c61C559ab07233',
    assetId: 'USDC',
    amount: '13',
  });
  console.log(run_result);
}, 25000);
