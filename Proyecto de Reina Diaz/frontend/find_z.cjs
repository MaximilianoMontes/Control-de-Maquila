const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, 'dist/assets/index-BXGXiGwy.js');
const content = fs.readFileSync(jsPath, 'utf8');

const regex = /(?:const|let|var)\s+z\s*=\s*(?:'[^']*'|"[^"]*"|`[^`]*`|[a-zA-Z0-9_.-]+)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`Found pattern: ${match[0]} at index ${match.index}`);
  const start = Math.max(0, match.index - 50);
  const end = Math.min(content.length, match.index + 150);
  console.log("Context:\n", content.slice(start, end));
}

// Also try to find where VITE_API_URL or localhost:3001 is
console.log("\nSearching for 'localhost:3001' or similar backend URLs:");
const urlRegex = /https?:\/\/[a-zA-Z0-9_.-]+(?::\d+)?/g;
while ((match = urlRegex.exec(content)) !== null) {
  console.log(`Found URL: ${match[0]} at index ${match.index}`);
}
