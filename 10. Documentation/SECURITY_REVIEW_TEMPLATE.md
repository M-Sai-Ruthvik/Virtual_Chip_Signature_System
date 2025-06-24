# Security Review Template

## Smart Contracts
- [ ] No reentrancy, overflow/underflow, or access control issues
- [ ] Only authorized addresses can call sensitive functions
- [ ] All external calls are checked and handled safely
- [ ] Contract tested with MythX, Slither, or Oyente

## Backend
- [ ] All user inputs validated and sanitized
- [ ] No secrets or private keys in code
- [ ] HTTPS enforced for all endpoints
- [ ] Sensitive endpoints require authentication/authorization
- [ ] Security-relevant events are logged

## Frontend
- [ ] No private keys or sensitive data exposed in browser
- [ ] HTTPS enforced for all communications
- [ ] User input validated and sanitized
- [ ] Errors handled gracefully, no sensitive info leaked

## Hardware
- [ ] Debug interfaces (JTAG/UART) protected
- [ ] Secure boot/bitstream encryption used if available
- [ ] Physical security of FPGA/ASIC ensured

## General
- [ ] Code reviewed for security issues
- [ ] Dependencies up to date, no known vulnerabilities
- [ ] Incident response plan documented

## Reviewer Name:

## Date:

## Summary/Notes: 