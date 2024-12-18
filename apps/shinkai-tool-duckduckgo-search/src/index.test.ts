import { run } from './index.ts';
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test('searches DuckDuckGo and gets a response', async () => {
  const result = await run({}, { message: 'best movie of all time' });
  const message = result.message;
  const searchResults = JSON.parse(message.replace(/^searching: /, ''));

  assertExists(searchResults, 'Search results should exist');
  assertEquals(Array.isArray(searchResults), true, 'Results should be an array');
  assertEquals(searchResults.length > 0, true, 'Results should not be empty');
  assertExists(searchResults[0].title, 'Result should have title');
  assertExists(searchResults[0].url, 'Result should have url');
  assertExists(searchResults[0].description, 'Result should have description');
});
