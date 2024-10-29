import TurndownService from 'npm:turndown';
import axios from 'npm:axios';
import { Run, ToolDefinition } from '@shinkai_protocol/shinkai-tools-builder';

type Config = {};
type Params = {
  urls: string[];
};

type Result = { markdowns: string[] };

export const run: Run<Config, Params, Result> = async (
  _configurations: Config,
  parameters: Params,
): Promise<Result> => {
  try {
    const responses = await axios.all(
      parameters.urls.map((url) => axios.get(url)),
    );
    const turndownService = new TurndownService();
    const markdowns = responses.map((response: any) =>
      turndownService.turndown(response.data),
    );
    return Promise.resolve({ markdowns });
  } catch (error) {
    console.log('error', error);
    return Promise.resolve({ markdowns: [] });
  }
};

export const definition: ToolDefinition<typeof run> = {
  id: 'shinkai-tool-download-pages',
  name: 'Shinkai: Download Pages',
  description:
    'Downloads one or more URLs and converts their HTML content to Markdown',
  author: 'Shinkai',
  keywords: [
    'HTML to Markdown',
    'web page downloader',
    'content conversion',
    'URL to Markdown',
  ],
  configurations: {
    type: 'object',
    properties: {},
    required: [],
  },
  parameters: {
    type: 'object',
    properties: {
      urls: { type: 'array', items: { type: 'string' } },
    },
    required: ['urls'],
  },
  result: {
    type: 'object',
    properties: {
      markdowns: { type: 'array', items: { type: 'string' } },
    },
    required: ['markdowns'],
  },
};
