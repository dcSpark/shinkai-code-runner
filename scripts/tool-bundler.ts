/**
 * Script to bundle and process Shinkai tools
 *
 * This script takes an entry file and output folder as arguments, bundles the tool code,
 * generates embeddings for the tool definition, and creates an extended tool definition
 * that includes the code and embedding metadata.
 *
 * Usage:
 * Run with --entry and --outputFolder parameters:
 * deno run tool-bundler.ts --entry=<entry-file> --outputFolder=<output-folder>
 *
 * The script will:
 * 1. Read and bundle the tool code from the entry file
 * 2. Write the bundled code to index.ts in the output folder
 * 3. Import the tool definition from the bundled code
 * 4. Create an extended tool definition with code and embeddings
 * 5. Write the extended definition to definition.json in the output folder
 */

import { join } from 'node:path';
import minimist from 'npm:minimist';
import fs from 'node:fs';

console.log('🚀 Starting Shinkai Tool bundler...');

// Extended type that includes code and embedding metadata
type ExtendedToolDefinition = ToolDefinition<any> & {
  code: string;
  embedding_metadata: {
    model_name: 'snowflake-arctic-embed:xs';
    embeddings: number[];
  };
};

// Parse command line arguments
console.log('📝 Parsing command line arguments...');
const args = minimist(Deno.args);
const entryFile: string = join(Deno.cwd(), args.entry);
const outputFolder: string = join(Deno.cwd(), args.outputFolder);
const outputFile: string = join(outputFolder, 'index.ts');

console.log('📂 Entry file:', entryFile);
console.log('📂 Output folder:', outputFolder);
console.log('📂 Output file:', outputFile);

console.log('📦 Starting tool processing...');
fs.promises
  .readFile(entryFile, 'utf-8')
  .then(async (code) => {
    // Write bundled code to output file
    console.log('📝 Writing bundled code to output file...');
    // Ensure output folder exists
    await fs.promises.mkdir(outputFolder, { recursive: true });
    await fs.promises.writeFile(outputFile, code);

    // Import tool definition from bundled code
    console.log('📥 Importing tool definition...');
    const { definition }: { definition: ToolDefinition<any> } = await import(
      Deno.build.os == 'windows' ? `file://${outputFile}` : outputFile
    );

    console.log('✨ Tool definition loaded:', definition.name);

    // Create extended tool definition with code and embeddings
    console.log('🔨 Creating extended tool definition...');
    const toolDefinition: ExtendedToolDefinition = {
      ...definition,
      code,
      embedding_metadata: {
        model_name: 'snowflake-arctic-embed:xs',
        embeddings: [], // Empty embeddings while we remove completely the built-in tools feature
      },
    };

    // Write extended definition to JSON file
    const definitionPath = join(outputFolder, 'definition.json');
    console.log('💾 Writing extended definition to:', definitionPath);
    await fs.promises.writeFile(
      definitionPath,
      JSON.stringify(toolDefinition, null, 2),
    );

    console.log('✅ Tool processing completed successfully!');
  })
  .catch((e) => {
    console.log('❌ Error processing tool:', e);
    process.exit(1);
  });
