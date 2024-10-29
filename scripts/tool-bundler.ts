import { join } from 'node:path';
import minimist from 'npm:minimist';
import fs from 'node:fs';
import process from 'node:process';
import axios from 'npm:axios';
import { bundle } from 'jsr:@deno/emit';
import type { ToolDefinition } from '@shinkai_protocol/shinkai-tools-builder';

type ExtendedToolDefinition = ToolDefinition<any> & {
  code: string;
  embedding_metadata: {
    model_name: 'snowflake-arctic-embed:xs';
    embeddings: number[];
  };
};

const args = minimist(process.argv.slice(2));
const entryFile: string = join(process.cwd(), args.entry);
const outputFolder: string = join(process.cwd(), args.outputFolder);
const outputFile: string = join(outputFolder, 'index.js');

console.log('entryFile', entryFile);
console.log('outputFolder', outputFolder);
console.log('outputFile', outputFile);

console.log('main module', Deno.mainModule);
async function getEmbeddings(prompt: string): Promise<number[]> {
  const apiUrl = process.env.EMBEDDING_API_URL || 'http://localhost:11434';
  const response = await axios.post(`${apiUrl}/api/embeddings`, {
    model: 'snowflake-arctic-embed:xs',
    prompt,
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch embeddings: ${response.statusText}`);
  }

  return response.data.embedding;
}

async function bundleTool(entryFile: string): Promise<{ code: string }> {
  console.info(`bundling ${entryFile}`);
  const url = new URL(entryFile, import.meta.url);
  const result = await bundle(url, {
    minify: false,
  });
  return result;
}

bundleTool(entryFile)
  .then(async ({ code }) => {
    console.log('\tbundled code', code);
    console.log('\twriting to', outputFile);
    await fs.promises.writeFile(outputFile, code);
    const { definition }: { definition: ToolDefinition<any> } = await import(
      outputFile
    );

    console.log('\tdefinition', definition);

    // Get embeddings
    const prompt = `${definition.id} ${definition.name} ${definition.description} ${definition.author} ${definition.keywords.join(' ')}`;
    const embeddings = await getEmbeddings(prompt);

    // Generate extended tool definition
    console.log(`Generating embedding with model: snowflake-arctic-embed:xs`);
    const toolDefinition: ExtendedToolDefinition = {
      ...definition,
      code,
      embedding_metadata: {
        model_name: 'snowflake-arctic-embed:xs',
        embeddings,
      },
    };

    // Write tool definition to output folder
    const definitionPath = join(outputFolder, 'definition.json');
    console.log('\tdefinition path', definitionPath);
    await fs.promises.writeFile(
      definitionPath,
      JSON.stringify(toolDefinition, null, 2),
    );
  })
  .catch((e) => {
    console.log('error', e);
    process.exit(1);
  });
