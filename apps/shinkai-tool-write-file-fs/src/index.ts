import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { WebSocketClient } from './WebSocketClient';

type Config = {};
type Params = {
  destination: string;
  content: string;
};
type Result = { message: string };

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-write-file-fs',
    name: 'Shinkai: Create / Write / Generate File To FS',
    description:
      'Creates / Writes / Generates a file to the file system. E.g. Create or overwrite a file with name "test.txt", destination "/" and content "Hello, world!"',
    author: 'Shinkai',
    keywords: ['create', 'generate', 'write', 'file', 'fs'],
    configurations: {
      type: 'object',
      properties: {},
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        destination: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['destination', 'content'],
    },
    result: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    const { destination, content } = params;

    // Extract name from destination
    const name = destination.split('/').pop();
    if (!name || !/\.[^/.]+$/.test(name)) {
      const errorMessage =
        'The file name must have an extension (e.g., .txt, .pdf).';
      console.error(errorMessage);
      return { data: { message: errorMessage } };
    }

    // Check if the first 100 characters of content are base64
    const first100Chars = content.substring(0, 100);
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(first100Chars);
    const finalContent = isBase64
      ? content
      : Buffer.from(content).toString('base64');

    const wsClient = new WebSocketClient('ws://127.0.0.1:9555');

    try {
      await wsClient.connect();

      // Set destination to "." if it is empty
      const finalDestination = destination || '.';

      const requestMessage = wsClient.createRequestMessage('writefile', {
        name,
        destination: finalDestination,
        content: finalContent,
      });
      await wsClient.send(requestMessage);

      const response = await wsClient.handleMessages();
      const message = response.message;
      console.log(message);

      return { data: { message } };
    } catch (error) {
      let errorMessage = 'Error connecting to WebSocket';
      if (error instanceof Error) {
        errorMessage = `Error connecting to WebSocket: ${error.message}`;
      }
      console.error(errorMessage);
      return { data: { message: errorMessage } };
    } finally {
      // Ensure the WebSocket connection is closed
      await wsClient.close();
    }
  }
}
