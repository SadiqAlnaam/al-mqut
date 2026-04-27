
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

// Line numbers from view_file (1-indexed) are 1917 and 1918
// Subtract 1 for array index
const line1917Index = 1917 - 1;
const line1918Index = 1918 - 1;

if (lines[line1917Index].includes('));') && lines[line1918Index].includes('})()}')) {
  lines[line1917Index] = lines[line1917Index].replace('));', ');');
  lines.splice(line1918Index, 0, '                           });');
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log('Successfully fixed line 1917 and added closing brace.');
} else {
  console.error('Failed to find unique pattern at line 1917/1918');
  console.log('Line 1917:', lines[line1917Index]);
  console.log('Line 1918:', lines[line1918Index]);
}
