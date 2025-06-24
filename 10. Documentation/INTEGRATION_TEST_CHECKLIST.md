# Full-Stack Integration Test Checklist

## 1. Preparation
- [ ] Ensure frontend, backend, hardware, and blockchain components are up to date.
- [ ] Deploy or connect to the latest smart contract (see `4. Blockchain_Interaction/DEPLOYMENT_GUIDE.md`).
- [ ] Program FPGA with latest bitstream (see `8. FPGA_Testing/HARDWARE_INTEGRATION_CHECKLIST.md`).
- [ ] Start backend server (`backend/server.js`).
- [ ] Start frontend UI.

## 2. End-to-End Test Flow
- [ ] Connect MetaMask to the correct network (e.g., Sepolia).
- [ ] Submit a signature request via the frontend UI.
- [ ] Backend processes request, interacts with hardware (FPGA), and returns signature.
- [ ] Frontend displays signature and verification result.
- [ ] Backend and frontend log all actions.
- [ ] Signature is verified on-chain using the smart contract.

## 3. Verification
- [ ] Check logs for errors (backend, frontend, hardware, blockchain events).
- [ ] Compare hardware output to simulation reference.
- [ ] Confirm on-chain verification matches expected result.

## 4. Troubleshooting
- [ ] Check network connectivity (blockchain, backend, hardware).
- [ ] Use debug UI and logs for diagnosis.
- [ ] Review smart contract events for verification status.

## References
- Backend: `backend/server.js`
- Frontend: `1. Frontend_UI/`
- Hardware: `8. FPGA_Testing/`
- Blockchain: `4. Blockchain_Interaction/` 