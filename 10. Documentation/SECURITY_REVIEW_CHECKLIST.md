# Security Review Checklist

## Smart Contracts
- [ ] Review for reentrancy, overflow/underflow, and access control vulnerabilities.
- [ ] Use OpenZeppelin libraries where possible.
- [ ] Ensure only authorized addresses can call sensitive functions.
- [ ] Test with tools like MythX, Slither, or Oyente.
- [ ] Review deployment and upgrade procedures.

## Backend
- [ ] Validate all user inputs (length, type, format).
- [ ] Sanitize data before processing or storing.
- [ ] Use HTTPS for all API endpoints.
- [ ] Store private keys securely (never hardcode in repo).
- [ ] Limit access to sensitive endpoints (authentication/authorization).
- [ ] Log security-relevant events.

## Frontend
- [ ] Never expose private keys or sensitive data in the browser.
- [ ] Use HTTPS for all communications.
- [ ] Validate and sanitize user input.
- [ ] Handle errors gracefully and avoid leaking sensitive info.

## Hardware
- [ ] Protect debug interfaces (JTAG/UART) from unauthorized access.
- [ ] Use secure boot and bitstream encryption if available.
- [ ] Physically secure FPGA/ASIC devices.

## General
- [ ] Conduct regular code reviews and security audits.
- [ ] Use automated tools for static and dynamic analysis.
- [ ] Keep dependencies up to date and monitor for vulnerabilities.
- [ ] Document all security procedures and incident response plans. 