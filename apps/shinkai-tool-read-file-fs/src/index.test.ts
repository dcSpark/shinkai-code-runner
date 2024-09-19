import { Tool } from '../src/index';

test('exists definition', async () => {
  const tool = new Tool({ ws_password: '123456' });
  const definition = tool.getDefinition();
  expect(definition).toBeInstanceOf(Object);
});

test('read file', async () => {
  const tool = new Tool({ ws_password: '123456' });
  const result = await tool.run({ file_path: 'nico.txt' });
  console.log(result);
  expect(result).toBeInstanceOf(Object);
  if ('contentBase64' in result.data) {
    const decodedContent = Buffer.from(
      result.data.contentBase64,
      'base64',
    ).toString('utf-8');
    expect(decodedContent).toBe('hello world! 2nd attempt');
  } else {
    throw new Error('File content not found');
  }
});
