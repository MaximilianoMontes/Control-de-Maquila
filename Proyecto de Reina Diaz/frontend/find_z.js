const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, 'dist/assets/index-BXGXiGwy.js');
console.log("Reading file:", jsPath);
const content = fs.readFileSync(jsPath, 'utf8');

// Find z definition: e.g. "z = ..." or "z="..." or "z:" or similar.
// Let's search around "var Os=z"
const index = content.indexOf('var Os=z;');
if (index !== -1) {
  console.log("Found 'var Os=z;' at index:", index);
  const start = Math.max(0, index - 200);
  const end = Math.min(content.length, index + 200);
  console.log("Context:\n", content.slice(start, end));
} else {
  console.log("Could not find 'var Os=z;'");
}
