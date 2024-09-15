import { Tool } from '../src/index';

test('exists definition', async () => {
  const tool = new Tool({ ws_password: '123456' });
  const definition = tool.getDefinition();
  expect(definition).toBeInstanceOf(Object);
});

test('find file', async () => {
  const tool = new Tool({ ws_password: '123456' });
  const result = await tool.run({ partial_file_name: 'nic' });
  console.log(result);
  expect(result).toBeInstanceOf(Object);
});
