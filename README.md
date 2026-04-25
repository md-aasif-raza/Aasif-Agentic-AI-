# OG Agentic AI

Created by: **Md Aasif Raza**

This is an autonomous Agentic AI that runs on the **ReAct (Reason + Act) Framework**. It is designed to autonomously plan, execute, and accomplish complex business and research tasks.

## Features

- **Autonomous Planning & Execution**: Works in a loop of Thought, Action, Observation, and Answer.
- **Web Search**: Can search the web for the latest information.
- **Web Scraping**: Can read content directly from websites.
- **File System Operations**: Can read and write local files to save research reports or create code.

## Setup Instructions

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Configure API Keys**:
    - Rename `.env.example` to `.env`
    - Add your `GEMINI_API_KEY` (Get it from Google AI Studio).
    - *(Optional)* Add a `TAVILY_API_KEY` for more robust web search capabilities.
3.  **Run the Agent**:
    ```bash
    npm start
    ```

## Customizing the Task

Open `src/index.js` and modify the `task` variable:
```javascript
const task = "Your specific research or business task here...";
```

Then run `npm start` to see the magic happen!
