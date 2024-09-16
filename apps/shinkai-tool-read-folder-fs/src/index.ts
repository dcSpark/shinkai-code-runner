import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { WebSocketClient } from './WebSocketClient';

type Config = {
  // ws_password: string;
};
type Params = {
  folder_to_read?: string;
};
type Result = { tableCsv: string };

type ResponseItem = {
  [key: string]: any;
};

type AuthResponse = {
  status: string;
  message: any;
};

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-shinkai-tool-read-folder-fs',
    name: 'Shinkai: Read Files From Folder',
    description: 'Read the files from a folder in the file system',
    author: 'Shinkai',
    keywords: ['read', 'folder', 'fs'],
    configurations: {
      type: 'object',
      properties: {},
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        folder_to_read: { type: 'string', nullable: true },
      },
      required: [],
    },
    result: {
      type: 'object',
      properties: {
        tableCsv: { type: 'string', nullable: true },
      },
      required: ['tableCsv'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    // TODO: this should be a config by the tool or the general tool?
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

      const requestMessage = wsClient.createRequestMessage(
        'readfolder',
        params.folder_to_read || '.',
      );
      await wsClient.send(requestMessage);

      const response = await wsClient.handleMessages();
      const message: ResponseItem[] = response.message;
      console.log(message);

      // Convert response to CSV format
      const headers = Object.keys(message[0]);
      const rows = message.map((item: any) =>
        headers.map((header) => item[header]),
      );
      const tableCsv = [headers, ...rows]
        .map((row) => row.join(';'))
        .join('\n');

      return { data: { tableCsv } };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return { data: { tableCsv: 'Error connecting to WebSocket' } };
    } finally {
      wsClient.close();
    }
  }
}
