/**
 * Script to bundle and process Shinkai tools
 *
 * This script takes an entry file and output folder as arguments, bundles the tool code,
 * generates embeddings for the tool definition, and creates an extended tool definition
 * that includes the code and embedding metadata.
 *
 * Usage:
 * Run with --entry and --outputFolder parameters:
 * deno run tool-bundler.ts --entry=&lt;entry-file&gt; --outputFolder=&lt;output-folder&gt;
 *
 * The script will:
 * 1. Read and bundle the tool code from the entry file
 * 2. Write the bundled code to index.ts in the output folder
 * 3. Import the tool definition from the bundled code
 * 4. Generate embeddings for the tool's metadata using the snowflake-arctic-embed model
 * 5. Create an extended tool definition with code and embeddings
 * 6. Write the extended definition to definition.json in the output folder
 */

import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { parse } from "https://deno.land/std@0.208.0/flags/mod.ts";

console.log('🚀 Starting Shinkai Tool bundler...');

// Extended type that includes code and embedding metadata
type ExtendedToolDefinition = {
  id: string;
  name: string;
  description: string;
  author: string;
  keywords: string[];
  code: string;
  embedding_metadata: {
    model_name: 'snowflake-arctic-embed:xs';
    embeddings: number[];
  };
};

// Parse command line arguments
console.log('📝 Parsing command line arguments...');
const args = parse(Deno.args);
const entryFile: string = join(Deno.cwd(), args.entry);
const outputFolder: string = join(Deno.cwd(), args.outputFolder);
const outputFile: string = join(outputFolder, 'index.ts');

console.log('📂 Entry file:', entryFile);
console.log('📂 Output folder:', outputFolder);
console.log('📂 Output file:', outputFile);

/**
 * Fetches embeddings for a given prompt using the snowflake-arctic-embed model
 * @param prompt Text to generate embeddings for
 * @returns Array of embedding numbers
 */
export async function getEmbeddings(prompt: string): Promise<number[]> {
  console.log('🔍 Fetching embeddings from model...');
  const apiUrl = Deno.env.get("EMBEDDING_API_URL") || 'http://localhost:11434';

  if (apiUrl === 'debug') {
    console.log('🔧 Using mock embeddings for debug mode');
    return Array(384).fill(0.1);
  }

  const response = await fetch(`${apiUrl}/api/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: 'snowflake-arctic-embed:xs',
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch embeddings: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embeddings;
}

console.log('📦 Starting tool processing...');
await ensureDir(outputFolder);

// Read and write files using Deno APIs
const code = await Deno.readTextFile(entryFile);
console.log('📝 Writing bundled code to output file...');
await Deno.writeTextFile(outputFile, code);

// Import tool definition from bundled code
console.log('📥 Importing tool definition...');
const { definition }: { definition: ExtendedToolDefinition } = await import(
  Deno.build.os == 'windows' ? `file://${outputFile}` : outputFile
);

console.log('✨ Tool definition loaded:', definition.name);

// Generate embeddings from tool metadata
console.log('🧮 Generating embeddings for tool metadata...');
const prompt = `${definition.id} ${definition.name} ${definition.description} ${definition.author} ${definition.keywords.join(' ')}`;
const embeddings = await getEmbeddings(prompt);

// Create extended tool definition with code and embeddings
console.log('🔨 Creating extended tool definition...');
const toolDefinition: ExtendedToolDefinition = {
  ...definition,
  code,
  embedding_metadata: {
    model_name: 'snowflake-arctic-embed:xs',
    embeddings,
  },
};

// Write extended definition to JSON file
const definitionPath = join(outputFolder, 'definition.json');
console.log('💾 Writing extended definition to:', definitionPath);
await Deno.writeTextFile(
  definitionPath,
  JSON.stringify(toolDefinition, null, 2),
);

console.log('✅ Tool processing completed successfully!');
