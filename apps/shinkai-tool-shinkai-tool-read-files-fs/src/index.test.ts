import { Tool } from '../src/index';

test('exists definition', async () => {
  const tool = new Tool({});
  const definition = tool.getDefinition();
  expect(definition).toBeInstanceOf(Object);
});

test('run definition', async () => {
  const tool = new Tool({});
  const run_result = await tool.run({
    message: 'hello world shinkai-tool-read-files-fs',
  });
  console.log(run_result);
}, 25000);
