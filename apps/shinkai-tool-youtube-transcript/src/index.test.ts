import { Tool } from '../src/index';

test('exists definition', async () => {
  const tool = new Tool({});
  const definition = tool.getDefinition();
  expect(definition).toBeInstanceOf(Object);
});

test('transcript video', async () => {
  const tool = new Tool({});
  const result = await tool.run({
    // Video about Shinkai Sheets
    url: 'https://youtu.be/RxxuM4wbVQc',
    ollamaModel: 'llama3.1:8b-instruct-q4_1'
  });
  expect(result.data.transcript).toBeInstanceOf(Array);
  expect(result.data.transcript.length).toBeGreaterThan(0);

  console.log(result.data.message);
}, 30000);
