# Secret Scan Checklist

Before making your project public or deploying, ensure there are **no secrets** (private keys, passwords, API tokens, mnemonics, etc.) in your codebase.

## Manual Checklist
- [ ] No private keys in any `.js`, `.json`, `.env`, or Verilog files
- [ ] No API tokens or passwords in code or configs
- [ ] No sensitive data in documentation or test files
- [ ] No hardcoded credentials in frontend or backend

## Automated Scan (Linux)
Run this script in your project root:
```bash
grep -r -i --color=always 'secret\|private\|password\|api\|token\|mnemonic\|key' .
```
- Review any matches and remove/replace as needed.

## Common Files to Check
- `backend/`
- `1. Frontend_UI/`
- `2. Verilog_Chip_Core/`
- `.env`, `.json`, `.js`, `.v`, `.md`

## What to Do If You Find a Secret
- Remove it from the codebase
- Rotate the secret (generate a new one)
- Never commit secrets to version control 