
## **Virtual Chip Signature System**

### **Project Summary**
This is a sophisticated cryptographic hardware-software system that implements digital signature generation and verification using ECDSA (Elliptic Curve Digital Signature Algorithm) and Keccak-256 hashing. The project combines hardware design (Verilog) with a web-based interface to enable cryptographic operations across FPGA and blockchain environments.

### **Key Technical Components**

**Hardware Architecture (56.5% JavaScript, 25.8% Verilog)**
- **Verilog Chip Core**: Implements cryptographic primitives including:
  - ECDSA Signer and Verifier modules
  - Keccak-256 hash module
  - Modular arithmetic operations
  - 256-bit message processing and 520-bit signature outputs

- **AXI4-Lite Interface**: Hardware communication protocol featuring:
  - Write/Read address, data, and response handlers
  - Register mapping (Control, Status, Data Input/Output registers)
  - Status feedback with busy, done, and error flags
  - Proper handshake protocol for master-slave communication

**Software Integration (56.5% JavaScript)**
- **Frontend UI**: Web-based interface for user interaction
- **Backend Services**: Node.js implementation with Hardhat framework
- **Blockchain Interaction**: Solidity smart contracts (2.1%) for blockchain integration
- **Testing Suite**: Comprehensive test infrastructure (VCD waveform files for FPGA verification)

### **Architecture Highlights**
1. **Modular Design**: Separated into numbered components (Verilog Core, Output Interface, Blockchain Integration, Tools, Tests, FPGA Testing, Documentation)
2. **Cross-Platform**: Supports CPU/FPGA communication through standardized AXI4 protocols
3. **Security-First**: Includes dedicated security notes and proper error handling with AXI response codes
4. **Production-Ready**: MIT licensed with comprehensive documentation and automated startup scripts
