import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeWebpage(url) {
    console.log(`[Tool] Scraping webpage: ${url}`);
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(data);
        
        // Remove scripts, styles, etc.
        $('script, style, noscript, iframe, img, svg, header, footer, nav').remove();
        
        // Get text and clean it up
        let text = $('body').text();
        text = text.replace(/\s+/g, ' ').trim();
        
        // Limit output length to prevent overloading the LLM
        return text.substring(0, 5000); 
    } catch (error) {
        return `Failed to scrape webpage: ${error.message}`;
    }
}
