import axios from 'axios';

// A simple tool using DuckDuckGo HTML search for free, or an API if provided.
export async function performWebSearch(query) {
    console.log(`[Tool] Searching web for: ${query}`);
    
    // If Tavily API Key exists, we use it for better results.
    if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY !== 'your_tavily_api_key_here_or_serpapi') {
        try {
            const res = await axios.post('https://api.tavily.com/search', {
                api_key: process.env.TAVILY_API_KEY,
                query: query,
                search_depth: "basic",
                include_answer: true,
                max_results: 5
            });
            return res.data.answer || JSON.stringify(res.data.results.map(r => ({ title: r.title, url: r.url, content: r.content })));
        } catch (err) {
            console.error(`[Tool] Tavily API failed: ${err.response?.data?.error || err.message}. Falling back...`);
        }
    }

    // Fallback: Using a free/open API or mock data to avoid complex scraping if no key
    // In a real production system, you'd integrate SerpAPI or Tavily.
    // For now, let's use the Wikipedia API as a quick fallback if it's a general concept.
    try {
        const wpRes = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`);
        const hits = wpRes.data.query.search;
        if (hits && hits.length > 0) {
            return hits.slice(0, 3).map(h => `Title: ${h.title}\nSnippet: ${h.snippet.replace(/<\/?[^>]+(>|$)/g, "")}`).join('\n\n');
        }
    } catch(err) {
        // Ignore Wikipedia errors
    }

    return `Simulated Search Results for "${query}". In a real deployment, please provide a TAVILY_API_KEY or SERPAPI key.`;
}
