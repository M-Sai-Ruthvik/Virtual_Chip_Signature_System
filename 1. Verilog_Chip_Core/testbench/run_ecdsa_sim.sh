#!/bin/bash

# ECDSA Simulation Script
# Runs the ECDSA testbench and generates waveforms

echo "=== ECDSA Virtual Chip Simulation ==="
echo "Starting ECDSA testbench simulation..."

# Check if iverilog is available
if ! command -v iverilog &> /dev/null; then
    echo "Error: iverilog not found. Please install Icarus Verilog."
    echo "Ubuntu/Debian: sudo apt-get install iverilog"
    echo "CentOS/RHEL: sudo yum install iverilog"
    exit 1
fi

# Check if gtkwave is available
if ! command -v gtkwave &> /dev/null; then
    echo "Warning: gtkwave not found. Waveforms will not be displayed."
    echo "Install with: sudo apt-get install gtkwave"
fi

# Compile the testbench
echo "Compiling ECDSA testbench..."
iverilog -o ecdsa_sim \
    ../ECDSA_Signer.v \
    ecdsa_tb.v

if [ $? -ne 0 ]; then
    echo "Compilation failed!"
    exit 1
fi

# Run the simulation
echo "Running simulation..."
./ecdsa_sim

if [ $? -ne 0 ]; then
    echo "Simulation failed!"
    exit 1
fi

# Display waveforms if gtkwave is available
if command -v gtkwave &> /dev/null; then
    echo "Opening waveform viewer..."
    gtkwave ecdsa_tb.vcd &
else
    echo "Simulation complete. Waveform file: ecdsa_tb.vcd"
    echo "Install gtkwave to view waveforms: sudo apt-get install gtkwave"
fi

echo "=== ECDSA Simulation Complete ===" 