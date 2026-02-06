---
description: Code refactorization and testing to make sure everything works.
arguement-hint: [file-path]
---

# Refactor Python Code: $ARGUMENTS
Refactor the files to improve code quality and readability.

If $ARGUMENTS is empty:
Refactor the entire codebase

## Steps

1. **Read the file:** `cat $ARGUMENTS`
2. **Analyze the code** and identify issues:
   - Long components
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
   - Removed unused files, functions, imports.

4. **Create tests And Run Tests** Write meaningful test cases (preferably TDD-style) to make sure everything works.   

5. **Show before/after comparison**

## Refactoring Checklist

Components should be clear
No Lint Errors
Unused Files, functions, imports and variables removed
No duplicate code