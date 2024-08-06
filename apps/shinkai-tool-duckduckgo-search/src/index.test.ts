import { Tool } from '../src/index';

test('exists definition', async () => {
  const tool = new Tool({});
  const definition = tool.getDefinition();
  const result = await tool.run({ message: 'hi' });
  expect(definition).toBeInstanceOf(Object);
  expect(result.data.message).toBe('echoing: hi');
});

test('searches DuckDuckGo and gets a response', async () => {
  const tool = new Tool({});
  const result = await tool.run({ message: 'best movie of all time' });
  const message = result.data.message;
  const searchResults = JSON.parse(message.replace(/^searching: /, ''));

  expect(Array.isArray(searchResults)).toBe(true);
  expect(searchResults.length).toBeGreaterThan(0);
  expect(searchResults[0]).toHaveProperty('title');
  expect(searchResults[0]).toHaveProperty('url'); // Updated from 'href' to 'url'
  expect(searchResults[0]).toHaveProperty('description'); // Updated from 'body' to 'description'
});
