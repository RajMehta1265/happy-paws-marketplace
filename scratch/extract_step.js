import fs from 'fs';

const logFilePath = 'C:/Users/rajme/.gemini/antigravity-ide/brain/c13a4b42-bdc9-449f-8b31-71e591d4f50f/.system_generated/logs/transcript.jsonl';
const fileContents = fs.readFileSync(logFilePath, 'utf8');
const lines = fileContents.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 5090) {
      console.log('Step 5090 found!');
      if (obj.tool_calls) {
        for (const call of obj.tool_calls) {
          if (call.name === 'write_to_file') {
            console.log('CodeContent length:', call.args.CodeContent.length);
            fs.writeFileSync('scratch/step_5090_cinematic.tsx', call.args.CodeContent, 'utf8');
            console.log('Written to scratch/step_5090_cinematic.tsx');
          }
        }
      }
    }
  } catch (err) {}
}
