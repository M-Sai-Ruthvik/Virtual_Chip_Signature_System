#!/bin/bash
# run_full_sim.sh - Complete simulation script for Virtual Chip Signature System
# Compiles all modules and runs comprehensive tests
# Author: Virtual Chip Signature System

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SIM_DIR="simulation"
LOG_DIR="logs"
WAVE_DIR="waves"
TOP_MODULE="virtual_chip_tb"
VERILOG_FILES=(
    "AXI_Interface.v"
    "ECDSA_Key_Config.v"
    "ECDSA_Signer.v"
    "ECDSA_Verifier.v"
    "Keccak256_Module.v"
    "Memory_Loader.v"
    "Modular_Arithmetic.v"
    "Nonce_Handler.v"
    "Output_Handler.v"
    "VirtualChip.v"
    "testbench/virtual_chip_tb.v"
)

# Create directories
mkdir -p $SIM_DIR $LOG_DIR $WAVE_DIR

echo -e "${BLUE}=== Virtual Chip Signature System - Full Simulation ===${NC}"
echo -e "${YELLOW}Starting comprehensive simulation...${NC}"

# Function to check if iverilog is installed
check_iverilog() {
    if ! command -v iverilog &> /dev/null; then
        echo -e "${RED}Error: iverilog not found. Please install Icarus Verilog.${NC}"
        echo "Ubuntu/Debian: sudo apt-get install iverilog"
        echo "CentOS/RHEL: sudo yum install iverilog"
        exit 1
    fi
}

# Function to check if vvp is installed
check_vvp() {
    if ! command -v vvp &> /dev/null; then
        echo -e "${RED}Error: vvp not found. Please install Icarus Verilog.${NC}"
        exit 1
    fi
}

# Function to check if gtkwave is installed
check_gtkwave() {
    if ! command -v gtkwave &> /dev/null; then
        echo -e "${YELLOW}Warning: gtkwave not found. Waveform viewing will be disabled.${NC}"
        echo "Ubuntu/Debian: sudo apt-get install gtkwave"
        echo "CentOS/RHEL: sudo yum install gtkwave"
        GTKWAVE_AVAILABLE=false
    else
        GTKWAVE_AVAILABLE=true
    fi
}

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"
check_iverilog
check_vvp
check_gtkwave

# Clean previous simulation
echo -e "${BLUE}Cleaning previous simulation...${NC}"
rm -rf $SIM_DIR/* $LOG_DIR/* $WAVE_DIR/*

# Compile all modules
echo -e "${BLUE}Compiling Verilog modules...${NC}"
COMPILE_CMD="iverilog -o $SIM_DIR/sim"
for file in "${VERILOG_FILES[@]}"; do
    if [ -f "$file" ]; then
        COMPILE_CMD="$COMPILE_CMD $file"
        echo -e "${GREEN}  ✓ $file${NC}"
    else
        echo -e "${RED}  ✗ $file (not found)${NC}"
        exit 1
    fi
done

# Execute compilation
echo -e "${YELLOW}Executing: $COMPILE_CMD${NC}"
if eval $COMPILE_CMD 2>&1 | tee $LOG_DIR/compile.log; then
    echo -e "${GREEN}✓ Compilation successful${NC}"
else
    echo -e "${RED}✗ Compilation failed. Check $LOG_DIR/compile.log${NC}"
    exit 1
fi

# Run simulation
echo -e "${BLUE}Running simulation...${NC}"
SIM_CMD="vvp $SIM_DIR/sim -lxt2"
echo -e "${YELLOW}Executing: $SIM_CMD${NC}"

if $SIM_CMD 2>&1 | tee $LOG_DIR/simulation.log; then
    echo -e "${GREEN}✓ Simulation completed successfully${NC}"
else
    echo -e "${RED}✗ Simulation failed. Check $LOG_DIR/simulation.log${NC}"
    exit 1
fi

# Generate waveform file
if [ -f "dump.vcd" ]; then
    mv dump.vcd $WAVE_DIR/simulation.vcd
    echo -e "${GREEN}✓ Waveform saved to $WAVE_DIR/simulation.vcd${NC}"
fi

# Analyze results
echo -e "${BLUE}Analyzing simulation results...${NC}"
if grep -q "PASS" $LOG_DIR/simulation.log; then
    echo -e "${GREEN}✓ All tests passed${NC}"
    PASS_COUNT=$(grep -c "PASS" $LOG_DIR/simulation.log)
    echo -e "${GREEN}  Total passes: $PASS_COUNT${NC}"
else
    echo -e "${YELLOW}⚠ No PASS messages found in simulation${NC}"
fi

if grep -q "FAIL" $LOG_DIR/simulation.log; then
    echo -e "${RED}✗ Some tests failed${NC}"
    FAIL_COUNT=$(grep -c "FAIL" $LOG_DIR/simulation.log)
    echo -e "${RED}  Total failures: $FAIL_COUNT${NC}"
else
    echo -e "${GREEN}✓ No failures detected${NC}"
fi

# Generate summary report
echo -e "${BLUE}Generating summary report...${NC}"
cat > $LOG_DIR/summary.txt << EOF
Virtual Chip Signature System - Simulation Summary
=================================================
Date: $(date)
Simulation: $TOP_MODULE
Status: $(if grep -q "PASS" $LOG_DIR/simulation.log; then echo "PASSED"; else echo "FAILED"; fi)

Files Compiled:
$(for file in "${VERILOG_FILES[@]}"; do echo "  - $file"; done)

Results:
- Passes: $(grep -c "PASS" $LOG_DIR/simulation.log 2>/dev/null || echo "0")
- Failures: $(grep -c "FAIL" $LOG_DIR/simulation.log 2>/dev/null || echo "0")
- Errors: $(grep -c "ERROR" $LOG_DIR/simulation.log 2>/dev/null || echo "0")

Log Files:
- Compilation: $LOG_DIR/compile.log
- Simulation: $LOG_DIR/simulation.log
- Waveform: $WAVE_DIR/simulation.vcd
EOF

echo -e "${GREEN}✓ Summary report saved to $LOG_DIR/summary.txt${NC}"

# Open waveform viewer if available
if [ "$GTKWAVE_AVAILABLE" = true ] && [ -f "$WAVE_DIR/simulation.vcd" ]; then
    echo -e "${BLUE}Opening waveform viewer...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to close GTKWave${NC}"
    gtkwave $WAVE_DIR/simulation.vcd &
fi

echo -e "${GREEN}=== Simulation Complete ===${NC}"
echo -e "${BLUE}Logs: $LOG_DIR/${NC}"
echo -e "${BLUE}Waveforms: $WAVE_DIR/${NC}"
echo -e "${BLUE}Summary: $LOG_DIR/summary.txt${NC}" 