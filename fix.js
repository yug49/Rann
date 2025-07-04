const fs = require('fs');
const path = require('path');

const filePath = '/Users/shubhtastic/Documents/cyfrin_web3/Rann/frontend/src/pages/api/arena/[battleId].ts';

let content = fs.readFileSync(filePath, 'utf8');

// Change getKurukshetraContractAddress function to directly return the battleId
content = content.replace(
  /async function getKurukshetraContractAddress\(battleId: string\): Promise<string \| null> {[\s\S]*?}/,
  `async function getKurukshetraContractAddress(battleId: string): Promise<string | null> {
  // DIRECTLY USE BATTLEID AS CONTRACT ADDRESS - NO QUESTIONS ASKED
  console.log(\`📍 Using battleId directly: \${battleId}\`);
  return battleId;
}`
);

fs.writeFileSync(filePath, content);
console.log('File updated successfully');
