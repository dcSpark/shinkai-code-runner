import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { WebSocketClient } from './WebSocketClient';

type Config = {
  ws_password: string;
};
type Params = {
  name: string;
  destination: string;
  content: string;
};
type Result = { message: string };

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-write-file-fs',
    name: 'Shinkai: write-file-fs',
    description: 'New write-file-fs tool from template',
    author: 'Shinkai',
    keywords: ['write-file-fs', 'shinkai'],
    configurations: {
      type: 'object',
      properties: {
        ws_password: { type: 'string' },
      },
      required: ['ws_password'],
    },
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        destination: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['name', 'destination', 'content'],
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
    const { name, destination, content } = params;

    // Validate that the name has an extension
    if (!/\.[^/.]+$/.test(name)) {
      const errorMessage =
        'The file name must have an extension (e.g., .txt, .pdf).';
      console.error(errorMessage);
      return { data: { message: errorMessage } };
    }

    const wsClient = new WebSocketClient('ws://127.0.0.1:9555');

    try {
      await wsClient.connect();

      // // Authenticate with WebSocket using ws_password
      // const authMessage = wsClient.createRequestMessage('authenticate', this.config.ws_password);
      // await wsClient.send(authMessage);

      // // Check authentication response
      // const authResponse = await wsClient.handleMessages();
      // if (authResponse.status !== 'success') {
      //   throw new Error('Authentication failed');
      // }

      // Set destination to "." if it is empty
      const finalDestination = destination || '.';

      const requestMessage = wsClient.createRequestMessage('writefile', {
        name,
        destination: finalDestination,
        content,
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
