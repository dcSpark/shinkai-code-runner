import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { TranscriptResponse, YoutubeTranscript } from 'youtube-transcript';
import { Ollama } from 'ollama';

type Config = {
  ollamaApiUrl?: string;
};
type Params = {
  url: string;
  ollamaModel: string;
};
type Result = { transcript: TranscriptResponse[]; message: string };

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-youtube-transcript',
    name: 'Shinkai: YouTube Transcript',
    description: 'Retrieve the transcript of a YouTube video',
    author: 'Shinkai',
    keywords: ['youtube', 'transcript', 'video', 'captions', 'subtitles'],
    configurations: {
      type: 'object',
      properties: {
        ollamaApiUrl: { type: 'string', nullable: true },
      },
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the YouTube video to transcribe',
        },
        ollamaModel: {
          type: 'string',
          description: 'The Ollama model to use for generating the summary',
        },
      },
      required: ['url'],
    },
    result: {
      type: 'object',
      properties: {
        transcript: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              duration: { type: 'number' },
              offset: { type: 'number' },
              lang: { type: 'string', nullable: true },
            },
            required: ['text', 'duration', 'offset'],
          },
        },
        message: { type: 'string' },
      },
      required: ['transcript'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    console.log(`transcripting ${params.url}`);

    // Get transcription
    const transcript = await YoutubeTranscript.fetchTranscript(params.url);

    // Send to ollama to build a formatted response
    const message = {
      role: 'user',
      content: `
      According to this transcription of a youtube video (which is in csv separated by ';'):

      offset;text
      ${transcript.map((v) => `${v.offset};${v.text}`).join('\n')}
      ---------------

      The video URL is ${params.url}

      ---------------

      Write a detailed summary divided in sections along the video.
      Format the answer using markdown.
      Add markdown links referencing every section using this format https://www.youtube.com/watch?v={video_id}&t={offset} where 'offset' is a number and can be obtained from the transcription in csv format and should be in seconds to generate the URL
    `,
    };
    const ollamaClient = new Ollama({ host: 'http://localhost:11435' });
    try {
      const response = await ollamaClient.chat({
        model: params.ollamaModel,
        messages: [message],
        stream: false,
      });
      return Promise.resolve({
        data: { transcript, message: response.message.content },
      });
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      throw error;
    }
  }
}
