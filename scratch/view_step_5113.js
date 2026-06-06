import fs from 'fs';

const logFilePath = 'C:/Users/rajme/.gemini/antigravity-ide/brain/c13a4b42-bdc9-449f-8b31-71e591d4f50f/.system_generated/logs/transcript.jsonl';
const fileContents = fs.readFileSync(logFilePath, 'utf8');
const lines = fileContents.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 5113) {
      console.log('Step 5113 found!');
      if (obj.tool_calls) {
        for (const call of obj.tool_calls) {
          console.log('Call name:', call.name);
          console.log('Args:', JSON.stringify(call.args, null, 2));
        }
      }
    }
  } catch (err) {}
}
