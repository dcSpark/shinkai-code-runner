import { Tool } from '../src/index';

test('exists definition', async () => {
  const tool = new Tool({
    ws_password: 'password',
  });
  const definition = tool.getDefinition();
  expect(definition).toBeInstanceOf(Object);
});

test('run definition', async () => {
  const tool = new Tool({
    ws_password: 'password',
  });

  const params = {
    name: 'nico.txt',
    destination: '',
    content: Buffer.from('hello world! 2nd attempt').toString('base64'),
  };

  const run_result = await tool.run(params);
  console.log(run_result);
  expect(run_result.data).toEqual({
    message: {
      message: 'File written successfully',
      status: 'success',
    },
  });
}, 25000);
