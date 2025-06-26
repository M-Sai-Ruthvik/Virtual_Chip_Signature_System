#!/bin/bash

# Simplified ECDSA Simulation Script
# Runs the ECDSA testbench with minimal dependencies

echo "=== Simplified ECDSA Virtual Chip Simulation ==="
echo "Starting ECDSA testbench simulation..."

# Check if iverilog is available
if ! command -v iverilog &> /dev/null; then
    echo "Error: iverilog not found. Please install Icarus Verilog."
    echo "Ubuntu/Debian: sudo apt-get install iverilog"
    echo "CentOS/RHEL: sudo yum install iverilog"
    exit 1
fi

# Compile the testbench - only include necessary modules
echo "Compiling simplified ECDSA testbench..."
iverilog -I.. -o ecdsa_simple_sim \
    ../ECDSA_Signer.v \
    ../defines.v \
    ../config.v \
    ecdsa_simple_tb.v

if [ $? -ne 0 ]; then
    echo "Compilation failed!"
    exit 1
fi

# Run the simulation
echo "Running simulation..."
./ecdsa_simple_sim

if [ $? -ne 0 ]; then
    echo "Simulation failed!"
    exit 1
fi

echo "=== Simplified ECDSA Simulation Complete ===" 