import fs from 'fs';
import path from 'path';

const logFilePath = 'C:/Users/rajme/.gemini/antigravity-ide/brain/c13a4b42-bdc9-449f-8b31-71e591d4f50f/.system_generated/logs/transcript.jsonl';
console.log('Reading from logs...');

if (!fs.existsSync(logFilePath)) {
  console.log('File does not exist');
  process.exit(1);
}

const fileContents = fs.readFileSync(logFilePath, 'utf8');
const lines = fileContents.split('\n');
console.log('Total lines in log:', lines.length);

let foundCount = 0;
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls) {
      for (const call of obj.tool_calls) {
        const args = call.args;
        if (!args) continue;
        let targetFile = args.TargetFile;
        if (targetFile && (targetFile.includes('CinematicHero') || targetFile.includes('Header'))) {
          console.log(`Step ${obj.step_index || '?'}: ${call.name} on ${path.basename(targetFile)}`);
          if (call.name === 'write_to_file' || call.name === 'replace_file_content') {
            console.log('  Instruction:', args.Instruction || args.Description);
          }
          foundCount++;
        }
      }
    }
  } catch (err) {}
}
console.log(`Found ${foundCount} references.`);
