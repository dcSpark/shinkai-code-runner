import * as DDG from 'npm:duck-duck-scrape';

type Configurations = {};
type Parameters = {
  message: string;
};
type Result = { message: string };

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

export const run: Run<Configurations, Parameters, Result> = async (
  _configurations: Configurations,
  params: Parameters,
): Promise<Result> => {
  try {
    const searchResults = await DDG.search(params.message, {
      safeSearch: DDG.SafeSearchType.STRICT
    });
    console.log('searchResults', searchResults);
    return { message: JSON.stringify(searchResults.results) };
  } catch (error) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { message: `Error: ${errorMessage}` };
  }
};

export const definition: ToolDefinition<typeof run> = {
  id: 'shinkai-tool-duckduckgo-search',
  name: 'Shinkai: DuckDuckGo Search',
  description:
    'Searches the DuckDuckGo search engine. Example result: [{"title": "IMDb Top 250 Movies", "description": "Find out which <b>movies</b> are rated as the <b>best</b> <b>of</b> <b>all</b> <b>time</b> by IMDb users. See the list of 250 titles sorted by ranking, genre, year, and rating, and learn how the list is determined.", "url": "https://www.imdb.com/chart/top/"}]',
  author: 'Shinkai',
  keywords: ['duckduckgo', 'search', 'shinkai'],
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
      message: { type: 'string' },
    },
    required: ['message'],
  },
};
