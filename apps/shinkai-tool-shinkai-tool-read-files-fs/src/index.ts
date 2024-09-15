import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { WebSocketClient, MessageKind, Message } from './WebSocketClient';

type Config = {};
type Params = {
  message: string;
};
type Result = { message: string };

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-shinkai-tool-read-files-fs',
    name: 'Shinkai: shinkai-tool-read-files-fs',
    description: 'New shinkai-tool-read-files-fs tool from template',
    author: 'Shinkai',
    keywords: ['shinkai-tool-read-files-fs', 'shinkai'],
    configurations: {
      type: 'object',
      properties: {},
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
    result: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        },
        required: ['message']
      },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    const wsClient = new WebSocketClient('ws://127.0.0.1:9555');

    try {
      await wsClient.connect();
      const requestMessage = wsClient.createRequestMessage('readfolder', '.'); // Adjust the action and payload as needed
      await wsClient.send(requestMessage);

      const response = await wsClient.handleMessages();
      console.log(response);
      return { data: { message: JSON.stringify(response) } };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return { data: { message: 'Error connecting to WebSocket' } };
    }
  }
}
