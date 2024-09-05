import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';
import { TranscriptResponse, YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

type Config = {
  apiUrl?: string;
  apiKey?: string;
  model?: string;
};
type Params = {
  url: string;
};
type Result = { transcript: TranscriptResponse[]; message: string };

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-youtube-transcript',
    name: 'Shinkai: YouTube Transcript and Summary',
    description:
      'Extract and summarize the content of a YouTube video without watching it. This tool provides a detailed transcript and generates a comprehensive summary with organized sections and clickable timestamp links. To use this tool, you only need to provide a valid YouTube video URL. The tool will then process the video, retrieving its transcript and creating an easy-to-navigate summary. This is particularly useful for quickly grasping the main points of lengthy videos, preparing for discussions, or conducting research efficiently. For example, you could use this tool to summarize a long tech talk, a detailed product review, or an in-depth educational lecture, allowing you to decide if the full video is worth your time or to quickly reference specific parts of the content.',
    author: 'Shinkai',
    keywords: [
      'youtube',
      'transcript',
      'video',
      'summary',
      'sections',
      'timestamp',
      'links',
    ],
    configurations: {
      type: 'object',
      properties: {
        apiUrl: {
          type: 'string',
          description:
            'The URL of the OpenAI compatible API endpoint for summary generation. Optional. Default: "http://127.0.0.1:11435".',
          nullable: true,
          example: 'https://api.openai.com/v1',
        },
        apiKey: {
          type: 'string',
          description:
            'The API key for the OpenAI compatible endpoint. Required if using a service that needs authentication.',
          nullable: true,
          example: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        },
        model: {
          type: 'string',
          description:
            'The name of the language model for summary generation. Optional. Default: "llama3.1:8b-instruct-q4_1".',
          nullable: true,
          example: 'gpt-3.5-turbo',
        },
      },
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description:
            'The full URL of the YouTube video to transcribe and summarize. Must be a valid and accessible YouTube video link.',
          example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      },
      required: ['url'],
    },
    result: {
      type: 'object',
      properties: {
        transcript: {
          type: 'array',
          description:
            'An array of transcript segments from the video, providing a detailed text representation of the audio content.',
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description:
                  'The text content of a specific transcript segment.',
              },
              duration: {
                type: 'number',
                description: 'The duration of the segment in seconds.',
              },
              offset: {
                type: 'number',
                description:
                  'The start time of the segment in seconds from the beginning of the video.',
              },
              lang: {
                type: 'string',
                nullable: true,
                description: 'The language code of the segment, if available.',
              },
            },
            required: ['text', 'duration', 'offset'],
          },
        },
        message: {
          type: 'string',
          description:
            'A markdown-formatted summary of the video content, divided into sections with timestamp links to relevant parts of the video.',
        },
      },
      required: ['transcript', 'message'],
    },
  };

  async run(params: Params): Promise<RunResult<Result>> {
    console.log(`transcripting ${params.url}`);

    // Get transcription
    const transcript = await YoutubeTranscript.fetchTranscript(params.url);

    // Send to ollama to build a formatted response
    const message: OpenAI.ChatCompletionUserMessageParam = {
      role: 'user',
      content: `
      According to this transcription of a youtube video (which is in csv separated by ':::'):

      offset;text
      ${transcript.map((v) => `${Math.floor(v.offset)}:::${v.text}`).join('\n')}
      ---------------

      The video URL is ${params.url}

      ---------------

      Write a detailed summary divided in sections along the video.
      Format the answer using markdown.
      Add markdown links referencing every section using this format https://www.youtube.com/watch?v={video_id}&t={offset} where 'offset' is a number and can be obtained from the transcription in csv format to generate the URL
    `,
    };

    let url = this.config?.apiUrl || 'http://127.0.0.1:11435';
    url = url?.endsWith('/v1') ? url : `${url}/v1`;
    const client = new OpenAI({
      baseURL: url,
      apiKey: this.config?.apiKey || '',
    });
    try {
      const response = await client.chat.completions.create({
        model: this.config?.model || 'llama3.1:8b-instruct-q4_1',
        messages: [message],
        stream: false,
      });
      return Promise.resolve({
        data: {
          transcript,
          message: response.choices[0]?.message?.content || '',
        },
      });
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      throw error;
    }
  }
}
