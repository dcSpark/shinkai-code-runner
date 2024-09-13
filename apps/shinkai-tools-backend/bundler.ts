import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { execSync } from 'child_process';
import axios from 'axios';

const singleAppBinaryName =
  process.platform === 'win32'
    ? 'shinkai-tools-backend.exe'
    : 'shinkai-tools-backend';

async function getEmbeddings(prompt: string): Promise<number[]> {
  const apiUrl = process.env.EMBEDDING_API_URL || 'http://localhost:11434';
  const response = await fetch(`${apiUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'snowflake-arctic-embed:xs',
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch embeddings: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding;
}

async function updateTools() {
  // Print the current working directory
  console.log(`Current working directory: ${process.cwd()}`);

  const toolsDir = 'libs/shinkai-tools-runner/tools';
  const tools = fs.readdirSync(toolsDir);

  for (const tool of tools) {
    const toolPath = `${toolsDir}/${tool}`;
    const toolDefinitionPath = `${toolPath}/definition.json`;

    if (fs.existsSync(toolDefinitionPath)) {
      console.log(`Updating tool: ${tool}`);
      const toolDefinition = JSON.parse(
        fs.readFileSync(toolDefinitionPath, 'utf8'),
      );

      // Extract NAME and DESCRIPTION
      const name = toolDefinition.name;
      const description = toolDefinition.description;
      const prompt = `${name} ${description}`;

      // Get embeddings
      const embeddings = await getEmbeddings(prompt);

      // Add embedding metadata
      toolDefinition.embedding_metadata = {
        model_name: 'snowflake-arctic-embed:xs',
        embeddings,
      };

      // Save the updated tool definition
      fs.writeFileSync(
        toolDefinitionPath,
        JSON.stringify(toolDefinition, null, 2),
      );
      console.log(`Updated tool: ${tool}`);
    } else {
      console.warn(`Tool definition not found: ${toolDefinitionPath}`);
    }
  }
}

async function bundle() {
  try {
    console.log('Starting bundling process...');

    // Step: Update all tools
    console.log('Step: Updating all tools...');
    await updateTools();
    console.log('All tools updated successfully.');

    // Step: Bundle the application using esbuild
    console.log('Step: Bundling the application...');
    await esbuild.build({
      entryPoints: ['./apps/shinkai-tools-backend/src/index.ts'],
      bundle: true,
      platform: 'node',
      target: `node${fs.readFileSync('.nvmrc', 'utf8').trim().replace('v', '')}`,
      outfile: './dist/apps/shinkai-tools-backend/index.js',
    });
    console.log('Application bundled successfully.');

    // Step: Copy sea-config.json to the dist folder
    console.log('Step: Copying sea-config.json...');
    await fs.promises.copyFile(
      './apps/shinkai-tools-backend/sea-config.json',
      './dist/apps/shinkai-tools-backend/sea-config.json',
    );
    console.log('sea-config.json copied successfully.');

    // Step: Generate Single Executable Application (SEA) blob
    console.log('Step: Generating SEA blob...');
    process.chdir('./dist/apps/shinkai-tools-backend');
    execSync('node --experimental-sea-config sea-config.json');
    console.log('SEA blob generated successfully.');

    // Step: Copy the Node.js executable to create our custom executable
    console.log('Step: Copying Node.js executable...');
    const nodePath = process.execPath;
    fs.copyFileSync(nodePath, singleAppBinaryName);
    console.log('Node.js executable copied successfully.');

    // Step: Remove code signature on macOS or Windows
    // This is necessary because we're modifying the executable
    console.log('Step: Removing code signature if necessary...');
    if (process.platform === 'darwin') {
      execSync(`codesign --remove-signature ${singleAppBinaryName}`);
      console.log('Code signature removed successfully on macOS.');
    } else if (process.platform === 'win32') {
      // await execSync('signtool remove /s shinkai-tools-backend');
      console.log('Code signature removed successfully on Windows.');
    } else {
      console.log('Code signature removal not required on this platform.');
    }

    // Step: Inject the SEA blob into our custom executable
    // The command differs slightly between macOS and other platforms
    console.log('Step: Injecting SEA blob...');
    const additionalArgs: string[] = [];
    if (process.platform === 'darwin') {
      additionalArgs.push('--macho-segment-name NODE_SEA');
    }
    execSync(
      `npx postject ${singleAppBinaryName} NODE_SEA_BLOB index.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 ${additionalArgs.join(' ')}`,
    );
    console.log('SEA blob injected successfully.');

    // Step: Code sign the executable on macOS
    if (process.platform === 'darwin') {
      try {
        console.log('Step: Code signing the executable on macOS...');
        execSync(`codesign --sign - ${singleAppBinaryName}`);
        console.log('Executable successfully code signed on macOS.');
      } catch (error) {
        console.error('Failed to code sign the executable:', error);
        throw error;
      }
    } else {
      console.log('Code signing not required on this platform.');
    }

    console.log('Bundling completed successfully.');
  } catch (error) {
    console.error('Bundling failed:', error);
    process.exit(1);
  }
}

// Execute the bundling process
console.log('Initiating bundling process...');
bundle();
