---
description: Scoped code refactor with quality & test guarantees
arguement-hint: [file-path | directory]
---

# Refactor Project Code: $ARGUMENTS

## IMPORTANT:
- This command NEVER scans the entire repository automatically.
- If no argument is provided, refactor within refactor boundary.

## Rules
- Operate ONLY on explicitly provided files/directories or within refactor boundary
- No repo-wide inference
- One refactor phase per execution
- Minimal explanations

## If $ARGUMENTS is empty:
Refactor within refactor boundary.

## Refactor Boundary:
The following paths are tightly coupled and must be reasoned about together:
- src/components
- src/app
- src/hooks
- src/services
- src/types
- src/contexts

Everything else in the repo is out of scope and must be treated as stable.
Do NOT scan or modify files outside this boundary.

## Steps

1. **Read the file:** `cat $ARGUMENTS`
2. **Analyze the code** and identify issues:
   - Long components
   - Non-Relevant and Unneccassary Comments
   - Lint Errors
   - Duplicate code
   - Complex prop drilling

3. **Create improved version** with:
   - Structured code so future agents and automation can easily plug into it.
   - All critical write operations (swap, borrow, repay) are handled at backend.
   - Professional Level of code quality.
   - Best react components and hooks approach
   - Proper Typescript types
   - Clear File and function names
   - Extracted repeated code
   - Removed unused files, functions, imports and unneccassary comments.

4. **Create tests And Run Tests** Write meaningful test cases (preferably TDD-style) to make sure everything works.   

## Refactoring Checklist

Components should be clear
No Lint Errors
Unused Files, functions, imports and variables removed
No duplicate code