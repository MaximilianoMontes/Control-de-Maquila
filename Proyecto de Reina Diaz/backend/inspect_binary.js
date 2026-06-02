const fs = require('fs');
const path = require('path');

const buffer = fs.readFileSync(path.join(__dirname, 'erp.db'));
let strings = [];
let current = '';

for (let i = 0; i < buffer.length; i++) {
  const char = buffer[i];
  if (char >= 32 && char <= 126) {
    current += String.fromCharCode(char);
  } else {
    if (current.length >= 4) {
      strings.push(current);
    }
    current = '';
  }
}
if (current.length >= 4) {
  strings.push(current);
}

const uniqueStrings = [...new Set(strings)];

console.log("=== ALL 6-DIGIT SEQUENCES FOUND IN BINARY DATABASE ===");
const digitSeqs = [];
uniqueStrings.forEach(s => {
  const matches = s.match(/\d{6}/g);
  if (matches) {
    matches.forEach(m => digitSeqs.push(m));
  }
});
const uniqueDigits = [...new Set(digitSeqs)];
console.log(uniqueDigits);

console.log("\n=== ALL HISTORIAL ACTIVITY DESCRIPTION LOGS ===");
const logs = uniqueStrings.filter(s => 
  s.includes("Movió") || 
  s.includes("Retiró") || 
  s.includes("Eliminó") || 
  s.includes("Baja") || 
  s.includes("revers")
);
logs.forEach(s => console.log(s));
