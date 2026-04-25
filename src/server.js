import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Agent } from './agent.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// SECURITY HEADERS & SAFEGUARDS
app.use(helmet({ contentSecurityPolicy: false })); // Basic protection against XSS/Clickjacking
app.use(cors());
app.use(express.json());

// RATE LIMITING (Security: Prevent abuse)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

let currentClient = null;

// Fake DB for tracking usage limits (In a real app, use MongoDB/Postgres)
const userUsage = {};

app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    currentClient = res;
    
    req.on('close', () => {
        if (currentClient === res) currentClient = null;
    });
});

// GREETING ENDPOINT
app.post('/api/greet', (req, res) => {
    const { name, email, phone } = req.body;
    // Mocking NodeMailer / Twilio integration
    console.log(`\n📧 [NOTIFICATION SENT] Welcome Email sent to ${email}`);
    console.log(`📱 [SMS SENT] Welcome SMS sent to ${phone}`);
    res.status(200).json({ success: true });
});

app.post('/api/run', async (req, res) => {
    const { task, userId, plan, deepThinking } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key missing in .env" });
    }

    // USAGE LIMIT CHECK (Server-Side Validation)
    if (!userUsage[userId]) {
        userUsage[userId] = { count: 0 };
    }
    
    // Limits disabled. Fully free for now.
    /*
    if (plan === 'free' && userUsage[userId].count >= 5) {
        return res.status(403).json({ error: "Limit Reached", message: "Free trial limit of 5 messages reached. Upgrade required." });
    }
    */

    try {
        let selectedModel = 'gemini-2.5-flash';
        if (deepThinking && (plan === 'pro' || plan === 'max')) {
            selectedModel = 'gemini-2.5-pro';
        }

        const agent = new Agent({
            model: selectedModel,
            apiKey: process.env.GEMINI_API_KEY
        });
        
        // Don't wait for it to finish before responding ok, because we stream
        res.status(200).json({ status: "started" });
        
        // Increment usage count
        userUsage[userId].count += 1;

        // Apply plan specific limits (e.g., max steps)
        const maxSteps = plan === 'max' ? 25 : (plan === 'pro' ? 15 : 10);

        await agent.run(task, maxSteps, (stepData) => {
            if (currentClient) {
                currentClient.write(`data: ${JSON.stringify(stepData)}\n\n`);
            }
        });

    } catch (err) {
        if (currentClient) {
            currentClient.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🛡️  Secure Server running at: http://localhost:${PORT}`);
    console.log(`==============================================\n`);
});
