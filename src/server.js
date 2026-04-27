import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Agent } from './agent.js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// SECURITY HEADERS & SAFEGUARDS
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors());
app.use(express.json());

// RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: "Too many requests from this IP, please try again later."
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

let currentClient = null;

// Fake DBs
const userUsage = {};
const otpStore = new Map(); // Store OTPs with expiry

// Email Transporter Setup (Configure in .env in production)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'dummy@gmail.com',
        pass: process.env.EMAIL_PASS || 'dummy_password'
    }
});

// GENERATE & SEND OTP
app.post('/api/send-otp', async (req, res) => {
    const { email, phone } = req.body;
    if (!email || !phone) return res.status(400).json({ error: "Email and Phone are required." });

    // Generate 6-digit real OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP for 10 minutes (600,000 ms)
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email, { otp, phone, expiresAt });

    console.log(`\n================= OTP GENERATED =================`);
    console.log(`🔐 OTP for ${email} & ${phone} : ${otp}`);
    console.log(`⏳ Valid for 10 minutes.`);
    console.log(`=================================================\n`);

    // Try sending real email if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Agentic AI - Your Secure Login OTP",
                html: `<h3>Welcome to Agentic AI</h3><p>Your highly secure OTP is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>`
            });
            console.log(`📧 [REAL EMAIL SENT] Secure OTP sent to ${email}`);
        } catch (error) {
            console.log(`⚠️ [EMAIL FAILED] Please configure REAL EMAIL_USER and EMAIL_PASS in .env for real emails.`);
        }
    } else {
        console.log(`📧 [MOCK EMAIL SENT] Secure OTP sent to ${email} (Configure .env for real email)`);
    }

    // Mock sending SMS (Real SMS requires paid API like Twilio)
    console.log(`📱 [MOCK SMS SENT] Secure OTP sent to ${phone} (Twilio API required for real SMS)`);

    res.status(200).json({ success: true, message: "OTP Sent Successfully! Valid for 10 minutes." });
});

// VERIFY OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    
    const storedData = otpStore.get(email);
    if (!storedData) return res.status(400).json({ error: "No OTP found for this email. Please request a new one." });
    
    if (Date.now() > storedData.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ error: "OTP has expired. Valid for 10 minutes only." });
    }

    if (storedData.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP. Access Denied." });
    }

    // Success - Remove OTP
    otpStore.delete(email);
    
    // Generate secure token (mocked for now)
    const token = uuidv4();

    res.status(200).json({ success: true, token, message: "OTP Verified. Access Granted." });
});


app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    currentClient = res;
    
    req.on('close', () => {
        if (currentClient === res) currentClient = null;
    });
});


app.post('/api/run', async (req, res) => {
    const { task, userId, plan, deepThinking } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key missing in .env" });
    }

    if (!userUsage[userId]) userUsage[userId] = { count: 0 };

    try {
        let selectedModel = 'gemini-2.5-flash';
        if (deepThinking) {
            selectedModel = 'gemini-2.5-pro';
        }

        const agent = new Agent({
            model: selectedModel,
            apiKey: process.env.GEMINI_API_KEY
        });
        
        res.status(200).json({ status: "started" });
        userUsage[userId].count += 1;

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
    console.log(`🛡️  Secure 3D Server running at: http://localhost:${PORT}`);
    console.log(`==============================================\n`);
});
