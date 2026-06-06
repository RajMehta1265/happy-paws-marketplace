import fs from 'fs';

const logFilePath = 'C:/Users/rajme/.gemini/antigravity-ide/brain/c13a4b42-bdc9-449f-8b31-71e591d4f50f/.system_generated/logs/transcript.jsonl';
const fileContents = fs.readFileSync(logFilePath, 'utf8');
const lines = fileContents.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls) {
      for (const call of obj.tool_calls) {
        const args = call.args;
        if (!args) continue;
        let targetFile = args.TargetFile;
        if (targetFile && targetFile.includes('CinematicHero.tsx')) {
          console.log(`Step ${obj.step_index}: call = ${call.name}, args keys = ${Object.keys(args)}`);
          if (args.CodeContent) {
            console.log(`  CodeContent length: ${args.CodeContent.length}`);
            if (args.CodeContent.length > 2500) {
              console.log(`  Preview: ${args.CodeContent.slice(0, 300)}...`);
            }
          }
        }
      }
    }
  } catch (err) {}
}
