#!/usr/bin/env python3
"""
UNQA Swarm — Workspace Provisioning Script (Python)

Parses a masterplan.md DAG table and generates:
  - router.json (lightweight routing table)
  - Task folders with task.json and instruction.md per task
  - done/ directory

Usage: python3 provision.py --job-dir .unqa-swarm_workspace/job_[id]/
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def parse_array(s: str) -> list:
    """Parse array-like strings: ['item1', 'item2'] or plain text."""
    cleaned = s.replace('`', '').strip()
    if cleaned.startswith('['):
        try:
            return json.loads(cleaned.replace("'", '"'))
        except json.JSONDecodeError:
            cleaned = re.sub(r"[\[\]']", '', cleaned)
            return [x.strip() for x in cleaned.split(',') if x.strip()]
    if cleaned in ('None', '-', ''):
        return []
    return [x.strip() for x in cleaned.split(',') if x.strip()]


def main():
    # --- Argument Parsing ---
    if '--job-dir' not in sys.argv:
        print(json.dumps({'success': False, 'error': 'Missing --job-dir argument'}))
        sys.exit(1)

    job_dir_idx = sys.argv.index('--job-dir')
    if job_dir_idx + 1 >= len(sys.argv):
        print(json.dumps({'success': False, 'error': 'Missing --job-dir value'}))
        sys.exit(1)

    job_dir = Path(sys.argv[job_dir_idx + 1]).resolve()

    # --- Read Masterplan ---
    masterplan_path = job_dir / 'masterplan.md'
    if not masterplan_path.exists():
        print(json.dumps({'success': False, 'error': f'masterplan.md not found at {masterplan_path}'}))
        sys.exit(1)

    masterplan = masterplan_path.read_text(encoding='utf-8')

    # --- Extract Metadata ---
    job_id = job_dir.name
    project_match = re.search(r'^#\s+.*?Masterplan:\s*(.+)$', masterplan, re.MULTILINE)
    project_name = project_match.group(1).strip() if project_match else job_id
    architect_match = re.search(r'\*\*Architect:\*\*\s*(.+)$', masterplan, re.MULTILINE)
    architect_name = architect_match.group(1).strip() if architect_match else 'Unknown'

    # --- Parse DAG Table ---
    lines = masterplan.split('\n')
    table_start: int = -1
    for i, line in enumerate(lines):
        if re.match(r'^\|\s*(Task|Chunk)\s*ID', line, re.IGNORECASE):
            table_start = i
            break

    if table_start == -1:
        print(json.dumps({'success': False, 'error': 'No DAG table found in masterplan.md'}))
        sys.exit(1)

    # Parse headers dynamically
    header_line = lines[table_start]
    headers = [h.strip().lower() for h in header_line.split('|') if h.strip()]
    
    col_map = {
        'taskId': next((i for i, h in enumerate(headers) if 'id' in h), -1),
        'targetFile': next((i for i, h in enumerate(headers) if 'target' in h or 'file' in h), -1),
        'dependencies': next((i for i, h in enumerate(headers) if 'dep' in h), -1),
        'skills': next((i for i, h in enumerate(headers) if 'skill' in h), -1),
        'contextFiles': next((i for i, h in enumerate(headers) if 'context' in h or 'read' in h), -1),
        'antiGoals': next((i for i, h in enumerate(headers) if 'anti' in h), -1),
        'description': next((i for i, h in enumerate(headers) if 'desc' in h), -1)
    }

    # Fallback missing cols
    if col_map['taskId'] == -1: col_map['taskId'] = 0
    if col_map['targetFile'] == -1: col_map['targetFile'] = 1
    if col_map['dependencies'] == -1: col_map['dependencies'] = 2
    if col_map['skills'] == -1: col_map['skills'] = 3
    if col_map['description'] == -1: col_map['description'] = len(headers) - 1

    tasks = []
    start_index = int(table_start) + 2
    for i in range(start_index, len(lines)):
        line = lines[i].strip()
        if not line.startswith('|'):
            break

        # A simple split handles most markdown table rows safely
        raw_cols = line.split('|')
        if len(raw_cols) > 0 and raw_cols[0].strip() == '': raw_cols.pop(0)
        if len(raw_cols) > 0 and raw_cols[-1].strip() == '': raw_cols.pop(-1)
        
        cols = [c.strip() for c in raw_cols]
        if len(cols) < 2:
            continue

        def extract_col(idx):
            if idx != -1 and idx < len(cols):
                return cols[idx]
            return ''

        # Sanitize task ID
        raw_task_id = extract_col(col_map['taskId']).replace('`', '').strip()
        task_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_task_id)
        if not task_id:
            continue

        target_file = extract_col(col_map['targetFile']).replace('`', '').strip()

        # Dependencies
        deps_raw = extract_col(col_map['dependencies'])
        if deps_raw in ('None', '-', ''):
            dependencies = []
        else:
            dependencies = [d.strip() for d in deps_raw.replace('`', '').split(',') if d.strip()]

        assigned_skills = parse_array(extract_col(col_map['skills']))
        context_files = parse_array(extract_col(col_map['contextFiles']))
        anti_goals = parse_array(extract_col(col_map['antiGoals']))
        description = extract_col(col_map['description'])

        tasks.append({
            'task_id': task_id,
            'description': description,
            'dependencies': dependencies,
            'assigned_skills': assigned_skills,
            'target_file': target_file,
            'context_files_to_read': context_files,
            'anti_goals': anti_goals,
        })

    if not tasks:
        print(json.dumps({'success': False, 'error': 'No tasks parsed from DAG table'}))
        sys.exit(1)

    # --- Parse API Contracts ---
    api_contracts = {}
    contract_match = re.search(r'##\s*🔌\s*API\s*Contracts([\s\S]*?)(?=\n##\s|$)', masterplan)
    if contract_match:
        json_blocks = re.findall(r'```json\n([\s\S]*?)```', contract_match.group(1))
        for block in json_blocks:
            try:
                parsed = json.loads(block)
                api_contracts.update(parsed)
            except json.JSONDecodeError:
                pass

    # --- Generate router.json ---
    now = datetime.now(timezone.utc).isoformat()
    task_statuses = {t['task_id']: 'pending' for t in tasks}

    router = {
        'job_id': job_id,
        'project_name': project_name,
        'architect_name': architect_name,
        'manager_name': 'provision-script',
        'owner_name': None,
        'global_status': 'executing',
        'batch_limit': 3,
        'created_at': now,
        'updated_at': now,
        'tasks': task_statuses,
    }

    router_path = job_dir / 'router.json'
    router_path.write_text(json.dumps(router, indent=2), encoding='utf-8')

    # --- Create done/ directory ---
    done_dir = job_dir / 'done'
    done_dir.mkdir(parents=True, exist_ok=True)

    # --- Read Templates ---
    skill_root = Path(__file__).resolve().parent.parent
    task_schema_path = skill_root / 'templates' / 'task_schema.json'
    instruction_template_path = skill_root / 'templates' / 'instruction_template.md'

    instruction_template = (
        instruction_template_path.read_text(encoding='utf-8')
        if instruction_template_path.exists() else None
    )

    # --- Provision Each Task ---
    created_folders = []

    for task in tasks:
        task_id: str = str(task['task_id'])
        task_dir = job_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)

        # Generate task.json
        task_json = {
            'task_id': task_id,
            'description': task['description'],
            'dependencies': task['dependencies'],
            'assigned_skills': task['assigned_skills'],
            'target_file': task['target_file'],
            'current_status': 'pending',
            'workers_assigned': [],
            'context_files_to_read': task['context_files_to_read'],
            'anti_goals': task['anti_goals'],
            'api_contract': api_contracts,
            'status_history': [
                {
                    'status': 'pending',
                    'timestamp': now,
                    'changed_by': 'provision-script',
                    'notes': 'Mapped from masterplan.',
                }
            ],
        }

        (task_dir / 'task.json').write_text(
            json.dumps(task_json, indent=2), encoding='utf-8'
        )

        # Generate instruction.md
        if instruction_template is not None:
            instruction = str(instruction_template)
            instruction = instruction.replace('{{task_id}}', task_id)
            instruction = instruction.replace('{{target_file_path}}', str(task['target_file']))
            instruction = instruction.replace(
                '{{assigned_skills_array}}', json.dumps(task['assigned_skills'])
            )
            
            deps = task['dependencies']
            if isinstance(deps, list) and deps:
                deps_str = ', '.join(str(d) for d in deps)
            else:
                deps_str = 'None'
            
            instruction = instruction.replace('{{dependencies_list_or_none}}', deps_str)

            ctx_list = '\n'.join(f'* `{f}`' for f in task['context_files_to_read']) if isinstance(task['context_files_to_read'], list) else ''
            instruction = re.sub(r'\{\{context_files_to_read_list.*?\}\}', ctx_list, instruction)

            ag_list = '\n'.join(f'* {g}' for g in task['anti_goals']) if isinstance(task['anti_goals'], list) else ''
            instruction = re.sub(r'\{\{anti_goals_list.*?\}\}', ag_list, instruction)

            instruction = instruction.replace(
                '{{api_contract_from_task_json}}',
                json.dumps(api_contracts, indent=2),
            )

            instruction = re.sub(
                r'\{\{Specific description.*?\}\}', str(task['description']), instruction
            )

            (task_dir / 'instruction.md').write_text(instruction, encoding='utf-8')

        created_folders.append(task_id)

    # --- Output Result ---
    print(json.dumps({
        'success': True,
        'job_id': job_id,
        'tasks_provisioned': len(created_folders),
        'task_ids': created_folders,
        'router_path': str(router_path),
        'done_dir': str(done_dir),
    }))


if __name__ == '__main__':
    main()
