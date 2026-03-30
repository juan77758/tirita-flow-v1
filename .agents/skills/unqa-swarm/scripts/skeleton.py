#!/usr/bin/env python3
"""
UNQA Swarm — Skeleton Context Extractor (Python)

Usage: python3 skeleton.py <file1> [file2] [file3] ...

Extracts only type definitions, interfaces, classes, and function signatures.
Strips out function bodies, implementation logic, and comments to compress
large files into minimal AST-styled context for the LLM Worker.
Supports batch mode: pass multiple files for a single concatenated output.
"""

import sys
import os
import ast

def extract_python(content: str) -> str:
    """Uses Python's built-in AST to cleanly extract signatures."""
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return "/* Warning: SyntaxError during AST parse. Raw file: */\n\n" + content

    output = []
    
    # Process imports
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            # Fallback to source lines for imports to keep it simple, since unparsing imports is tedious in older Pythons
            output.append(ast.unparse(node) if hasattr(ast, 'unparse') else f"# import at line {node.lineno}")

    # Process classes and functions
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            output.append("")
            # Extract class signature
            bases = [ast.unparse(b) for b in node.bases] if hasattr(ast, 'unparse') else []
            bases_str = f"({', '.join(bases)})" if bases else ""
            output.append(f"class {node.name}{bases_str}:")
            
            # Extract methods
            empty = True
            for child in node.body:
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    prefix = "async " if isinstance(child, ast.AsyncFunctionDef) else ""
                    args = ast.unparse(child.args) if hasattr(ast, 'unparse') else "..."
                    returns_node = child.returns
                    returns = f" -> {ast.unparse(returns_node)}" if hasattr(ast, 'unparse') and returns_node is not None else ""
                    output.append(f"    {prefix}def {child.name}({args}){returns}: ...")
                    empty = False
                elif isinstance(child, ast.AnnAssign):
                    # Class variables with type annotations
                    target = ast.unparse(child.target) if hasattr(ast, 'unparse') else ""
                    annotation = ast.unparse(child.annotation) if hasattr(ast, 'unparse') else ""
                    output.append(f"    {target}: {annotation}")
                    empty = False
            if empty:
                output.append("    pass")
                
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            output.append("")
            prefix = "async " if isinstance(node, ast.AsyncFunctionDef) else ""
            args = ast.unparse(node.args) if hasattr(ast, 'unparse') else "..."
            returns_node = node.returns
            returns = f" -> {ast.unparse(returns_node)}" if hasattr(ast, 'unparse') and returns_node is not None else ""
            output.append(f"{prefix}def {node.name}({args}){returns}: ...")

    return "\n".join(output)


def extract_typescript(text: str) -> str:
    """Fallback Regex parser for TS/JS files."""
    lines = text.split('\n')
    output = []
    in_interface: bool = False
    in_type: bool = False
    in_class: bool = False
    brace_depth: int = 0

    import re

    for line in lines:
        trimmed = line.strip()

        if trimmed.startswith('import ') or trimmed.startswith('export {'):
            output.append(line)
            continue

        if re.match(r'^(export\s+)?(interface|type)\s+[A-Z]', trimmed, re.IGNORECASE):
            output.append('')
            in_interface = True
        
        if re.match(r'^(export\s+)?(default\s+)?class\s+[A-Z]', trimmed, re.IGNORECASE):
            output.append('')
            output.append(line)
            in_class = True
            brace_depth = line.count('{') - line.count('}')
            continue

        if in_interface or in_type:
            output.append(line)
            if trimmed.endswith('}') or (trimmed.endswith(';') and in_type and brace_depth == 0):
                in_interface = False
                in_type = False
            continue

        if in_class:
            brace_depth = int(brace_depth) + int(line.count('{')) - int(line.count('}'))
            if trimmed and not trimmed.startswith('//') and brace_depth == 1:
                if '(' in trimmed and '{' in trimmed:
                    output.append(re.sub(r'\{.*$', '{}', line))
                else:
                    output.append(line)
            if brace_depth <= 0:
                output.append('}')
                in_class = False
            continue

        # Functions
        func_match = re.match(r'^(export\s+)?(async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(', trimmed)
        const_func_match = re.match(r'^(export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(async\s+)?\([^)]*\)\s*(:\s*[^=]+)?\s*=>', trimmed)

        if func_match:
            output.append(re.sub(r'\{.*$', '{} /* body omitted */', line))
        elif const_func_match:
            output.append(re.sub(r'=>\s*\{.*$', '=> {} /* body omitted */', line))

    return "\n".join(output)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 skeleton.py <file1> [file2] [file3] ...", file=sys.stderr)
        sys.exit(1)

    file_paths = []
    for i in range(1, len(sys.argv)):
        file_paths.append(sys.argv[i])

    for target_path in file_paths:
        if not os.path.exists(target_path):
            print(f"Error: File not found at {target_path}", file=sys.stderr)
            continue

        with open(target_path, 'r', encoding='utf-8') as f:
            content = f.read()

        ext: str = str(os.path.splitext(target_path)[1]).lower()

        if ext == '.py':
            skeleton = extract_python(content)
        elif ext in ('.ts', '.tsx', '.js', '.jsx'):
            skeleton = extract_typescript(content)
        else:
            skeleton = f"/* Warning: AST parser for {ext} not implemented. Raw file: */\n\n" + content

        print(f"--- Skeleton Context for {target_path} ---")
        print(skeleton)
        print("--- End Skeleton ---\n")

if __name__ == '__main__':
    main()
