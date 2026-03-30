#!/usr/bin/env node
/**
 * UNQA Swarm — Workspace Provisioning Script (Node.js)
 * 
 * Parses a masterplan.md DAG table and generates:
 *   - router.json (lightweight routing table)
 *   - Task folders with task.json and instruction.md per task
 *   - done/ directory
 * 
 * Usage: node provision.js --job-dir .unqa-swarm_workspace/job_[id]/
 */

const fs = require('fs');
const path = require('path');

// --- Argument Parsing ---
const args = process.argv.slice(2);
const jobDirIndex = args.indexOf('--job-dir');
if (jobDirIndex === -1 || !args[jobDirIndex + 1]) {
  console.error(JSON.stringify({ success: false, error: 'Missing --job-dir argument' }));
  process.exit(1);
}
const jobDir = path.resolve(args[jobDirIndex + 1]);

// --- Read Masterplan ---
const masterplanPath = path.join(jobDir, 'masterplan.md');
if (!fs.existsSync(masterplanPath)) {
  console.error(JSON.stringify({ success: false, error: `masterplan.md not found at ${masterplanPath}` }));
  process.exit(1);
}
const masterplan = fs.readFileSync(masterplanPath, 'utf-8');

// --- Extract Metadata ---
const jobId = path.basename(jobDir);
const projectNameMatch = masterplan.match(/^#\s+.*?Masterplan:\s*(.+)$/m);
const projectName = projectNameMatch ? projectNameMatch[1].trim() : jobId;
const architectMatch = masterplan.match(/\*\*Architect:\*\*\s*(.+)$/m);
const architectName = architectMatch ? architectMatch[1].trim() : 'Unknown';

// --- Parse DAG Table ---
const lines = masterplan.split('\n');
const tableStart = lines.findIndex(l => /^\|\s*(Task|Chunk)\s*ID/i.test(l));
if (tableStart === -1) {
  console.error(JSON.stringify({ success: false, error: 'No DAG table found in masterplan.md' }));
  process.exit(1);
}

// Parse headers dynamically
const headers = lines[tableStart].split('|').map(h => h.trim().toLowerCase()).filter(h => h.length > 0);

const colMap = {
  taskId: headers.findIndex(h => h.includes('id')),
  targetFile: headers.findIndex(h => h.includes('target') || h.includes('file')),
  dependencies: headers.findIndex(h => h.includes('dep')),
  skills: headers.findIndex(h => h.includes('skill')),
  contextFiles: headers.findIndex(h => h.includes('context') || h.includes('read')),
  antiGoals: headers.findIndex(h => h.includes('anti')),
  description: headers.findIndex(h => h.includes('desc'))
};

// Fallback for essential missing columns based on template defaults
if (colMap.taskId === -1) colMap.taskId = 0;
if (colMap.targetFile === -1) colMap.targetFile = 1;
if (colMap.dependencies === -1) colMap.dependencies = 2;
if (colMap.skills === -1) colMap.skills = 3;
if (colMap.description === -1) colMap.description = headers.length - 1;

const tasks = [];
for (let i = tableStart + 2; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line.startsWith('|')) break;
  
  // We use a regex split to avoid breaking on escaped pipes, though simple LLM tables rarely use them
  const rawCols = line.split('|');
  // the first and last split elements are usually empty because of leading/trailing pipes
  rawCols.shift();
  if (rawCols.length > 0 && rawCols[rawCols.length - 1].trim() === '') rawCols.pop();
  const cols = rawCols.map(c => c.trim());
  
  if (cols.length < 2) continue; // Need at least ID and Target
  
  const extractCol = (idx) => (idx !== -1 && idx < cols.length) ? cols[idx] : '';
  
  // Sanitize task ID to prevent path traversal
  const rawTaskId = extractCol(colMap.taskId).replace(/`/g, '').trim();
  const taskId = rawTaskId.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!taskId) continue;

  const targetFile = extractCol(colMap.targetFile).replace(/`/g, '').trim();
  
  // Parse dependencies
  const depsRaw = extractCol(colMap.dependencies);
  const dependencies = depsRaw === 'None' || depsRaw === '-' || depsRaw === '' 
    ? [] 
    : depsRaw.replace(/`/g, '').split(/,\s*/).map(d => d.trim()).filter(Boolean);
  
  // Parse arrays safely
  const assignedSkills = parseArray(extractCol(colMap.skills));
  const contextFiles = parseArray(extractCol(colMap.contextFiles));
  const antiGoals = parseArray(extractCol(colMap.antiGoals));
  const description = extractCol(colMap.description);
  
  tasks.push({
    task_id: taskId,
    description,
    dependencies,
    assigned_skills: assignedSkills,
    target_file: targetFile,
    context_files_to_read: contextFiles,
    anti_goals: antiGoals
  });
}

if (tasks.length === 0) {
  console.error(JSON.stringify({ success: false, error: 'No tasks parsed from DAG table' }));
  process.exit(1);
}

// --- Parse API Contracts ---
let apiContracts = {};
const contractSection = masterplan.match(/##\s*🔌\s*API\s*Contracts([\s\S]*?)(?=\n##\s|$)/);
if (contractSection) {
  const jsonBlocks = contractSection[1].match(/```json\n([\s\S]*?)```/g) || [];
  jsonBlocks.forEach(block => {
    try {
      const json = JSON.parse(block.replace(/```json\n?/, '').replace(/```/, ''));
      Object.assign(apiContracts, json);
    } catch (e) { /* skip malformed blocks */ }
  });
}

// --- Generate router.json ---
const now = new Date().toISOString();
const taskStatuses = {};
tasks.forEach(t => { taskStatuses[t.task_id] = 'pending'; });

const router = {
  job_id: jobId,
  project_name: projectName,
  architect_name: architectName,
  manager_name: 'provision-script',
  owner_name: null,
  global_status: 'executing',
  batch_limit: 3,
  created_at: now,
  updated_at: now,
  tasks: taskStatuses
};

fs.writeFileSync(path.join(jobDir, 'router.json'), JSON.stringify(router, null, 2));

// --- Create done/ directory ---
const doneDir = path.join(jobDir, 'done');
if (!fs.existsSync(doneDir)) fs.mkdirSync(doneDir, { recursive: true });

// --- Read Templates ---
const skillRoot = path.resolve(__dirname, '..');
const taskSchemaPath = path.join(skillRoot, 'templates', 'task_schema.json');
const instructionTemplatePath = path.join(skillRoot, 'templates', 'instruction_template.md');

const taskSchemaRaw = fs.existsSync(taskSchemaPath) ? fs.readFileSync(taskSchemaPath, 'utf-8') : null;
const instructionTemplate = fs.existsSync(instructionTemplatePath) ? fs.readFileSync(instructionTemplatePath, 'utf-8') : null;

// --- Provision Each Task ---
const createdFolders = [];

tasks.forEach(task => {
  const taskDir = path.join(jobDir, task.task_id);
  if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true });
  
  // Generate task.json
  const taskJson = {
    task_id: task.task_id,
    description: task.description,
    dependencies: task.dependencies,
    assigned_skills: task.assigned_skills,
    target_file: task.target_file,
    current_status: 'pending',
    workers_assigned: [],
    context_files_to_read: task.context_files_to_read,
    anti_goals: task.anti_goals,
    api_contract: apiContracts,
    status_history: [
      {
        status: 'pending',
        timestamp: now,
        changed_by: 'provision-script',
        notes: 'Mapped from masterplan.'
      }
    ]
  };
  
  fs.writeFileSync(path.join(taskDir, 'task.json'), JSON.stringify(taskJson, null, 2));
  
  // Generate instruction.md
  if (instructionTemplate) {
    let instruction = instructionTemplate
      .replace(/\{\{task_id\}\}/g, task.task_id)
      .replace(/\{\{target_file_path\}\}/g, task.target_file)
      .replace(/\{\{assigned_skills_array\}\}/g, JSON.stringify(task.assigned_skills))
      .replace(/\{\{dependencies_list_or_none\}\}/g, task.dependencies.length ? task.dependencies.join(', ') : 'None')
      .replace(/\{\{context_files_to_read_list.*?\}\}/g, task.context_files_to_read.map(f => `* \`${f}\``).join('\n'))
      .replace(/\{\{anti_goals_list.*?\}\}/g, task.anti_goals.map(g => `* ${g}`).join('\n'))
      .replace(/\{\{api_contract_from_task_json\}\}/g, JSON.stringify(apiContracts, null, 2));
    
    // Replace the objective placeholder
    instruction = instruction.replace(
      /\{\{Specific description.*?\}\}/g,
      task.description
    );
    
    fs.writeFileSync(path.join(taskDir, 'instruction.md'), instruction);
  }
  
  createdFolders.push(task.task_id);
});

// --- Output Result ---
console.log(JSON.stringify({
  success: true,
  job_id: jobId,
  tasks_provisioned: createdFolders.length,
  task_ids: createdFolders,
  router_path: path.join(jobDir, 'router.json'),
  done_dir: doneDir
}));

// --- Helpers ---
function parseArray(str) {
  // Handles: ['item1', 'item2'] or `['item1']` or plain text
  const cleaned = str.replace(/`/g, '').trim();
  if (cleaned.startsWith('[')) {
    try {
      return JSON.parse(cleaned.replace(/'/g, '"'));
    } catch (e) {
      return cleaned.replace(/[\[\]']/g, '').split(/,\s*/).map(s => s.trim()).filter(Boolean);
    }
  }
  if (cleaned === 'None' || cleaned === '-' || cleaned === '') return [];
  return cleaned.split(/,\s*/).map(s => s.trim()).filter(Boolean);
}
