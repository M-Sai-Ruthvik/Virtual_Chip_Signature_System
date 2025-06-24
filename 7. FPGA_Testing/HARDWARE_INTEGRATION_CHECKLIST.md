# Hardware Integration Checklist

## 1. Bitstream Generation
- [ ] Ensure all Verilog modules are up to date and pass simulation.
- [ ] Run synthesis script (e.g., `ecdsa_synthesis.tcl`, `keccak_synthesis.tcl`).
- [ ] Check for synthesis errors or warnings.
- [ ] Generate bitstream using your FPGA toolchain (Vivado, Quartus, etc.).

## 2. FPGA Programming
- [ ] Connect FPGA board to host machine.
- [ ] Use vendor tool (e.g., Vivado Hardware Manager) to program the bitstream.
- [ ] Verify successful programming.

## 3. Hardware-in-the-Loop Testing
- [ ] Prepare test vectors (see `2. Verilog_Chip_Core/test_vectors.mem`).
- [ ] Use UART/JTAG/PCIe or other interface to communicate with FPGA.
- [ ] Run test scripts and compare hardware output to simulation results.
- [ ] Log and analyze discrepancies.

## 4. Troubleshooting
- [ ] Check power, clock, and reset signals.
- [ ] Use onboard LEDs or debug pins for status.
- [ ] Use logic analyzer or ILA for internal signal inspection.
- [ ] Review synthesis and implementation logs for warnings/errors.

## References
- Synthesis scripts: `8. FPGA_Testing/ecdsa_synthesis.tcl`, `8. FPGA_Testing/keccak_synthesis.tcl`
- Bitstream build: `8. FPGA_Testing/build_bitstream.sh`
- Test vectors: `2. Verilog_Chip_Core/test_vectors.mem`
- Simulation reference: `6. Tools/Simulation/run_simulation.sh` 