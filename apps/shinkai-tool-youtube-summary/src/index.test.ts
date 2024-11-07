import { expect } from 'jsr:@std/expect/expect';
import { definition, run } from './index.ts';

Deno.test('exists definition', () => {
  expect(definition).toBeInstanceOf(Object);
});

Deno.test('transcript video', async () => {
  const result = await run(
    {
      apiUrl:
        Deno.env.get('CI') === 'true'
          ? 'https://api.openai.com/v1'
          : 'http://127.0.0.1:11434',
      apiKey:
        Deno.env.get('CI') === 'true' ? Deno.env.get('OPEN_API_API_KEY') : '',
      model: Deno.env.get('CI') === 'true' ? 'gpt-4o-mini' : '',
    },
    {
      url: 'https://www.youtube.com/watch?v=SUj34OWkjXU',
    },
  );
  expect(result.summary.length).toBeGreaterThan(0);
  console.log(result.summary);
});
