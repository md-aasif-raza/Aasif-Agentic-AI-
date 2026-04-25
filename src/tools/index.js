import { performWebSearch } from './webSearch.js';
import { scrapeWebpage } from './webScraper.js';
import { readLocalFile, writeLocalFile } from './fileSystem.js';

export const toolDefinitions = [
    {
        name: 'webSearch',
        description: 'Searches the web for information using a query.',
        schema: { type: 'webSearch', query: 'string' }
    },
    {
        name: 'scrapeWebpage',
        description: 'Extracts text content from a given URL.',
        schema: { type: 'scrapeWebpage', url: 'string' }
    },
    {
        name: 'readFile',
        description: 'Reads the contents of a local file.',
        schema: { type: 'readFile', filePath: 'string' }
    },
    {
        name: 'writeFile',
        description: 'Writes content to a local file.',
        schema: { type: 'writeFile', filePath: 'string', content: 'string' }
    }
];

export async function executeTool(action) {
    switch (action.type) {
        case 'webSearch':
            return await performWebSearch(action.query);
        case 'scrapeWebpage':
            return await scrapeWebpage(action.url);
        case 'readFile':
            return await readLocalFile(action.filePath);
        case 'writeFile':
            return await writeLocalFile(action.filePath, action.content);
        default:
            throw new Error(`Unknown tool type: ${action.type}`);
    }
}
