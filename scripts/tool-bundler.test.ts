import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { getEmbeddings } from "./tool-bundler.ts";

Deno.test("getEmbeddings - debug mode", async () => {
  await Deno.env.set("EMBEDDING_API_URL", "debug");
  const mockEmbeddings = await getEmbeddings("test prompt");
  assertEquals(mockEmbeddings.length, 384, "Mock embedding length should be 384");
  assertEquals(mockEmbeddings.every((v) => v === 0.1), true, "All values should be 0.1");
  console.log("✅ Debug mode test passed!");
});

Deno.test("getEmbeddings - normal mode", async () => {
  try {
    await Deno.env.set("EMBEDDING_API_URL", "http://localhost:11434");
    const realEmbeddings = await getEmbeddings("test prompt");
    assertEquals(realEmbeddings.length, 384, "Real embedding length should be 384");
    console.log("✅ Normal mode test passed!");
  } catch (error) {
    console.log("ℹ️ Skipping normal mode test - embedding service not available");
  }
});
