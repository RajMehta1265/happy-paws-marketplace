import fs from 'fs';

const logFilePath = 'C:/Users/rajme/.gemini/antigravity-ide/brain/c13a4b42-bdc9-449f-8b31-71e591d4f50f/.system_generated/logs/transcript.jsonl';
const fileContents = fs.readFileSync(logFilePath, 'utf8');
const lines = fileContents.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 5042) {
      console.log('Step 5042 found!');
      fs.writeFileSync('scratch/user_cinematic_code_5042.tsx', obj.content, 'utf8');
      console.log('Saved to scratch/user_cinematic_code_5042.tsx');
    }
  } catch (err) {}
}
