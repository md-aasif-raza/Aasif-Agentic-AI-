import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeTool, toolDefinitions } from './tools/index.js';

// The ReAct (Reason + Act) System Prompt
const SYSTEM_PROMPT = `You are "Aasif AI Bot", an advanced "OG Agentic AI" created by "Md Aasif Raza".
Your goal is to autonomously plan, execute, and accomplish the user's task.
You run in a loop of THOUGHT, ACTION, PAUSE, OBSERVATION.
At the end of the loop you output an ANSWER.

Use Thought to describe your thoughts about the question you have been asked.
Use Action to run one of the actions available to you - then return PAUSE.
Observation will be the result of running those actions.

Available Actions:
{TOOL_DESCRIPTIONS}

Example session:
Question: What is the capital of France and what is the current weather there?
Thought: I should find the capital of France first.
Action: 
{ "type": "webSearch", "query": "capital of France" }
PAUSE

Observation: Paris is the capital of France.
Thought: Now I should find the weather in Paris.
Action: 
{ "type": "webSearch", "query": "current weather in Paris" }
PAUSE

Observation: The weather in Paris is 15 degrees Celsius and sunny.
Thought: I have the answers.
ANSWER: The capital of France is Paris, and the current weather is 15 degrees Celsius and sunny.

Rules:
1. If you need to take an action, MUST respond with ONLY the Action JSON object and then PAUSE. 
2. If you have enough information to answer the user's task, respond with 'ANSWER: ' followed by your final result.
3. Be professional, brilliant, and thorough.
4. MULTILINGUAL SUPPORT: You must identify the language the user is using (e.g., Hinglish, English, Urdu, Hindi, etc.) and YOU MUST provide your final 'ANSWER:' and any communication to the user in that EXACT same language. Your internal 'Thought:' can remain in English, but the final result must match the user's language perfectly.`;

export class Agent {
    constructor({ model, apiKey }) {
        this.ai = new GoogleGenerativeAI(apiKey);
        this.modelName = model;
        this.memory = [];
        
        // Prepare tool descriptions for the prompt
        this.toolDescriptions = toolDefinitions.map(t => 
            `- ${t.name}: ${t.description} \n  Inputs: ${JSON.stringify(t.schema)}`
        ).join('\n\n');
        
        this.systemInstruction = SYSTEM_PROMPT.replace('{TOOL_DESCRIPTIONS}', this.toolDescriptions);
    }

    async generateResponse() {
        const model = this.ai.getGenerativeModel({ 
            model: this.modelName,
            systemInstruction: this.systemInstruction
        });
        
        const result = await model.generateContent({
            contents: this.memory,
            generationConfig: {
                temperature: 0.2,
            }
        });
        return result.response.text();
    }

    async run(task, maxSteps = 15, onStep = null) {
        console.log("🧠 Agent is analyzing the task...");
        if (onStep) onStep({ type: 'status', message: "🧠 Agent is analyzing the task..." });
        this.memory.push({ role: 'user', parts: [{ text: task }] });

        for (let step = 0; step < maxSteps; step++) {
            const reply = await this.generateResponse();
            
            // Add AI's response to memory
            this.memory.push({ role: 'model', parts: [{ text: reply }] });

            console.log(`\n--- Step ${step + 1} ---`);
            console.log(reply);

            // Extract thought
            let thoughtStr = "Thinking...";
            if (reply.includes('Thought:')) {
                thoughtStr = reply.split('Thought:')[1].split('Action:')[0].split('ANSWER:')[0].trim();
                if (onStep) onStep({ type: 'thought', message: thoughtStr });
            }

            // Check if AI provided final answer
            if (reply.includes('ANSWER:')) {
                const answer = reply.split('ANSWER:')[1].trim();
                if (onStep) onStep({ type: 'answer', message: answer });
                return answer;
            }

            // Check if AI wants to take an action
            if (reply.includes('Action:')) {
                try {
                    // Extract the JSON action, handling possible markdown code blocks
                    let actionStr = reply.split('Action:')[1].trim();
                    if (actionStr.startsWith('```json')) {
                        actionStr = actionStr.replace(/```json/g, '').replace(/```/g, '').trim();
                    } else if (actionStr.startsWith('```')) {
                        actionStr = actionStr.replace(/```/g, '').trim();
                    }
                    
                    // Match the first valid JSON object
                    const actionMatch = actionStr.match(/({[\s\S]*})/);
                    if (actionMatch && actionMatch[1]) {
                        const actionJson = JSON.parse(actionMatch[1]);
                        console.log(`\n🔧 Executing Tool: ${actionJson.type}`);
                        if (onStep) onStep({ type: 'action', message: `Executing: ${actionJson.type}`, details: actionJson });
                        
                        // Execute tool
                        const observation = await executeTool(actionJson);
                        console.log(`👀 Observation: ${observation.substring(0, 500)}...`);
                        if (onStep) onStep({ type: 'observation', message: `Result from ${actionJson.type} obtained.` });
                        
                        // Add observation to memory as user input
                        this.memory.push({ role: 'user', parts: [{ text: `Observation: ${observation}` }] });
                    }
                } catch (err) {
                    console.log(`❌ Tool execution failed: ${err.message}`);
                    if (onStep) onStep({ type: 'error', message: `Tool execution failed: ${err.message}` });
                    this.memory.push({ role: 'user', parts: [{ text: `Observation: Error executing tool. ${err.message}. Make sure your Action is valid JSON.` }] });
                }
            } else {
                // If it didn't PAUSE or give an ANSWER, prompt it to continue.
                this.memory.push({ role: 'user', parts: [{ text: `Please continue with an Action or provide the final ANSWER.` }] });
            }
        }

        if (onStep) onStep({ type: 'error', message: "Task failed: Exceeded maximum steps without reaching an answer." });
        return "Task failed: Exceeded maximum steps without reaching an answer.";
    }
}
