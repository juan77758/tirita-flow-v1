/**
 * UNQA Swarm — Skeleton Context Extractor
 * 
 * Usage: node skeleton.js <file1> [file2] [file3] ...
 * 
 * Extracts only type definitions, interfaces, classes, and function signatures.
 * Strips out function bodies, implementation logic, and comments to compress
 * large files into minimal AST-styled context for the LLM Worker.
 * Supports batch mode: pass multiple files for a single concatenated output.
 */

const fs = require('fs');
const path = require('path');

const filePaths = process.argv.slice(2);

if (filePaths.length === 0) {
  console.error('Usage: node skeleton.js <file1> [file2] [file3] ...');
  process.exit(1);
}

for (const targetPath of filePaths) {
  if (!fs.existsSync(targetPath)) {
    console.error(`Error: File not found at ${targetPath}`);
    continue;
  }

  const content = fs.readFileSync(targetPath, 'utf-8');
  const ext = path.extname(targetPath).toLowerCase();

  let skeleton = '';

  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    skeleton = extractTypeScript(content);
  } else if (ext === '.py') {
    skeleton = extractPython(content);
  } else {
    skeleton = `/* Warning: AST parser for ${ext} not implemented. Raw file: */\n\n` + content;
  }

  console.log(`--- Skeleton Context for ${targetPath} ---`);
  console.log(skeleton);
  console.log(`--- End Skeleton ---\n`);
}

// --- TS/JS Parser ---
function extractTypeScript(text) {
  const lines = text.split('\n');
  let output = [];
  let inInterface = false;
  let inType = false;
  let inClass = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Preserve top-level imports
    if (trimmed.startsWith('import ') || trimmed.startsWith('export {')) {
      output.push(line);
      continue;
    }

    // Capture Interfaces & Types entirely
    if (trimmed.match(/^(export\s+)?(interface|type)\s+[A-Z]/i)) {
      output.push('');
      inInterface = true;
    }
    
    // Capture Class signatures
    if (trimmed.match(/^(export\s+)?(default\s+)?class\s+[A-Z]/i)) {
      output.push('');
      output.push(line);
      inClass = true;
      braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      continue;
    }

    if (inInterface || inType) {
      output.push(line);
      if (trimmed.endsWith('}') || (trimmed.endsWith(';') && inType && braceDepth === 0)) {
        inInterface = false;
        inType = false;
      }
      continue;
    }

    if (inClass) {
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      // Capture class properties and methods (without bodies)
      if (trimmed && !trimmed.startsWith('//') && braceDepth === 1) {
        if (trimmed.includes('(') && trimmed.includes('{')) {
          output.push(line.replace(/\{.*$/, '{}')); // strip body
        } else {
          output.push(line);
        }
      }
      if (braceDepth <= 0) {
        output.push('}');
        inClass = false;
      }
      continue;
    }

    // Capture Function Signatures
    const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/);
    const constFuncMatch = trimmed.match(/^(export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(async\s+)?\([^)]*\)\s*(:\s*[^=]+)?\s*=>/);

    if (funcMatch) {
      output.push(line.replace(/\{.*$/, '{} /* body omitted */'));
    } else if (constFuncMatch) {
      output.push(line.replace(/=>\s*\{.*$/, '=> {} /* body omitted */'));
    }
  }
  return output.join('\n');
}

// --- Python Parser ---
function extractPython(text) {
  const lines = text.split('\n');
  let output = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Preserve top-level imports
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      output.push(line);
      continue;
    }

    // Capture Class Definitions
    if (trimmed.startsWith('class ')) {
      output.push('\n' + line);
      continue;
    }

    // Capture Function Defs (including indentation so class methods align)
    if (trimmed.startsWith('def ') || trimmed.startsWith('async def ')) {
      output.push(line + ' ...');
      continue;
    }
  }
  return output.join('\n');
}
