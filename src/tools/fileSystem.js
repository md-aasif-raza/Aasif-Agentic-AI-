import fs from 'fs/promises';
import path from 'path';

export async function readLocalFile(filePath) {
    console.log(`[Tool] Reading file: ${filePath}`);
    try {
        const fullPath = path.resolve(process.cwd(), filePath);
        const data = await fs.readFile(fullPath, 'utf-8');
        return data;
    } catch (error) {
        return `Error reading file: ${error.message}`;
    }
}

export async function writeLocalFile(filePath, content) {
    console.log(`[Tool] Writing to file: ${filePath}`);
    try {
        const fullPath = path.resolve(process.cwd(), filePath);
        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        await fs.writeFile(fullPath, content, 'utf-8');
        return `Successfully wrote to ${filePath}`;
    } catch (error) {
        return `Error writing to file: ${error.message}`;
    }
}
