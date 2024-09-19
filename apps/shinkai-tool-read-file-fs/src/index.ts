import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { WebSocketClient } from './WebSocketClient';

type Config = {};
type Params = {
  file_path: string;
};
type Result = { contentBase64: string } | { error: string };

type AuthResponse = {
  status: string;
  message: any;
};

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-read-file-fs',
    name: 'Shinkai: Read File From FS',
    description: 'Reads the content of a file from the filesystem',
    author: 'Shinkai',
    keywords: ['read', 'file', 'fs'],
    configurations: {
      type: 'object',
      properties: {},
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
      },
      required: ['file_path'],
    },
    result: {
      type: 'object',
      properties: {
        contentBase64: { type: 'string' },
      },
      required: ['contentBase64'],
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

      const requestMessage = wsClient.createRequestMessage(
        'readfile',
        params.file_path,
      );
      await wsClient.send(requestMessage);

      const response = await wsClient.handleMessages();
      console.log(response);

      if (response.message && response.message.status === 'error') {
        return { data: { error: response.message.message } };
      }

      const fileContent = response.message.data;
      const mimeType = response.message.mime_type;
      console.log(fileContent);

      // Determine if the file is a text file based on its MIME type
      const isTextFile = mimeType.startsWith('text/');

      if (isTextFile) {
        const utf8Content = Buffer.from(fileContent, 'base64').toString(
          'utf-8',
        );
        return { data: { contentBase64: utf8Content } };
      }

      return { data: { contentBase64: fileContent } };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return { data: { error: 'Error connecting to WebSocket' } };
    } finally {
      wsClient.close();
    }
  }
}
