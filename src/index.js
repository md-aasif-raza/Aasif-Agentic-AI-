import dotenv from 'dotenv';
import { Agent } from './agent.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

dotenv.config();

async function main() {
    console.clear();
    console.log(chalk.bold.cyan("==============================================================="));
    console.log(chalk.bold.green("   🚀 OG AGENTIC AI - Fully Autonomous Smart Agent "));
    console.log(chalk.bold.gray("   👨‍💻 Created by: Md Aasif Raza"));
    console.log(chalk.bold.cyan("===============================================================\n"));

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.log(chalk.red.bold("❌ Error: GEMINI_API_KEY is missing or invalid!"));
        console.log(chalk.yellow("Bhai, sabse pehle '.env' file me apni Gemini API Key dalo."));
        console.log(chalk.gray("Format: GEMINI_API_KEY=tumhari_key_yaha"));
        process.exit(1);
    }

    const { taskType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'taskType',
            message: chalk.bold.white('Bhai, Agent ko kaun sa task dena hai? (Select one)'),
            choices: [
                { name: '🔬 Research Task (Search for latest AI news & summarize)', value: 'research' },
                { name: '💼 Business Task (Create a marketing strategy for a new tech startup)', value: 'business' },
                { name: '🏠 Normal Task (Find top 3 workout routines for beginners)', value: 'normal' },
                { name: '✏️ Custom Task (Main khud type karunga)', value: 'custom' }
            ]
        }
    ]);

    let finalTask = "";

    if (taskType === 'research') {
        finalTask = "Search the web for the latest breakthroughs in Artificial Intelligence for the year 2026, summarize the top 3 trends, and write it into a file named 'AI_Research_Report.txt'.";
    } else if (taskType === 'business') {
        finalTask = "Search for successful marketing strategies for SaaS tech startups. Based on that, write a short, professional marketing email pitch to send to potential clients and save it to 'Business_Pitch.txt'.";
    } else if (taskType === 'normal') {
        finalTask = "Search the web for the best full-body home workout routine for beginners without equipment. Give me the routine in bullet points and save it to 'Workout_Plan.txt'.";
    } else {
        const { customTask } = await inquirer.prompt([
            {
                type: 'input',
                name: 'customTask',
                message: chalk.green('Apna task type karo:'),
                validate: input => input ? true : 'Task khali nahi ho sakta!'
            }
        ]);
        finalTask = customTask;
    }

    console.log(`\n${chalk.magenta('🎯 Selected Task:')} ${chalk.white.italic(finalTask)}\n`);

    const agent = new Agent({
        model: 'gemini-2.5-flash',
        apiKey: process.env.GEMINI_API_KEY
    });

    const spinner = ora({
        text: chalk.yellow('Agentic AI soch raha hai aur internet pe kaam kar raha hai...'),
        color: 'yellow'
    }).start();

    try {
        // We capture console logs from agent to show progress
        const originalLog = console.log;
        console.log = (...args) => {
            spinner.stop();
            originalLog(chalk.dim(...args));
            spinner.start();
        };

        const result = await agent.run(finalTask);
        
        console.log = originalLog; // restore
        spinner.succeed(chalk.green.bold('🎉 Task Successfully Completed!'));
        
        console.log(chalk.bold.cyan("\n================= FINAL RESULT =================\n"));
        console.log(chalk.white(result));
        console.log(chalk.bold.cyan("\n================================================\n"));
        
    } catch (error) {
        spinner.fail(chalk.red.bold('❌ Task Failed!'));
        console.error(chalk.red(error.message));
    }
}

main();
