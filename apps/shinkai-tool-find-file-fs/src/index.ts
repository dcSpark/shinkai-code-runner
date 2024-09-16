import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { WebSocketClient } from './WebSocketClient';

type Config = {};
type Params = {
  partial_file_name?: string;
  extension_name?: string;
};
type Result = { files: string[] } | { error: string };

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-find-file-fs',
    name: 'Shinkai: Find File Path',
    description:
      'Finds a file path using its name, partial name and/ or extension.',
    author: 'Shinkai',
    keywords: ['find-file-fs', 'shinkai'],
    configurations: {
      type: 'object',
      properties: {},
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        partial_file_name: { type: 'string', nullable: true },
        extension_name: { type: 'string', nullable: true },
      },
      required: [],
    },
    result: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
      },
      required: ['files'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
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

      const requestMessage = wsClient.createRequestMessage('findfilesbyname', {
        partial_file_name: params.partial_file_name ?? '', // Set to empty string if null/undefined
        extension_name: params.extension_name ?? '', // Set to empty string if null/undefined
      });
      await wsClient.send(requestMessage);

      const response = await wsClient.handleMessages();
      console.log(response);

      if (response.message && response.message.status === 'error') {
        return { data: { error: response.message.message } };
      }

      // Check if response.message.data exists and is an array
      if (response.message && Array.isArray(response.message)) {
        const files = response.message.map((file: any) => file.path); // Extract file paths
        console.log(files);
        return { data: { files } };
      } else {
        return { data: { error: 'Invalid response format' } };
      }
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return { data: { error: 'Error connecting to WebSocket' } };
    } finally {
      wsClient.close();
    }
  }
}
