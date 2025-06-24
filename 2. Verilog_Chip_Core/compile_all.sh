#!/bin/bash
# compile_all.sh - Compile all Verilog modules for Virtual Chip Signature System
# Supports multiple target platforms and optimization levels
# Author: Virtual Chip Signature System

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="build"
LOG_DIR="logs"
TARGET=${1:-"simulation"}  # Default target: simulation
OPT_LEVEL=${2:-"2"}        # Default optimization level: 2

# Verilog source files (in dependency order)
VERILOG_FILES=(
    "Modular_Arithmetic.v"
    "AXI_Interface.v"
    "ECDSA_Key_Config.v"
    "Nonce_Handler.v"
    "Keccak256_Module.v"
    "ECDSA_Signer.v"
    "ECDSA_Verifier.v"
    "Memory_Loader.v"
    "Output_Handler.v"
    "VirtualChip.v"
)

# Testbench files
TESTBENCH_FILES=(
    "testbench/virtual_chip_tb.v"
    "testbench/ecdsa_tb.v"
    "testbench/chip_tb.v"
)

# Create directories
mkdir -p $BUILD_DIR $LOG_DIR

echo -e "${BLUE}=== Virtual Chip Signature System - Compilation ===${NC}"
echo -e "${YELLOW}Target: $TARGET${NC}"
echo -e "${YELLOW}Optimization Level: $OPT_LEVEL${NC}"

# Function to check compiler
check_compiler() {
    case $TARGET in
        "simulation")
            if ! command -v iverilog &> /dev/null; then
                echo -e "${RED}Error: iverilog not found. Please install Icarus Verilog.${NC}"
                exit 1
            fi
            COMPILER="iverilog"
            ;;
        "vivado")
            if ! command -v vivado &> /dev/null; then
                echo -e "${RED}Error: vivado not found. Please install Xilinx Vivado.${NC}"
                exit 1
            fi
            COMPILER="vivado"
            ;;
        "quartus")
            if ! command -v quartus_map &> /dev/null; then
                echo -e "${RED}Error: quartus_map not found. Please install Intel Quartus.${NC}"
                exit 1
            fi
            COMPILER="quartus"
            ;;
        *)
            echo -e "${RED}Error: Unknown target '$TARGET'. Use: simulation, vivado, or quartus${NC}"
            exit 1
            ;;
    esac
}

# Function to compile for simulation
compile_simulation() {
    echo -e "${BLUE}Compiling for simulation...${NC}"
    
    # Compile main modules
    for file in "${VERILOG_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${YELLOW}Compiling: $file${NC}"
            iverilog -g2012 -Wall -o $BUILD_DIR/$(basename $file .v).o -c $file 2>&1 | tee -a $LOG_DIR/compile.log
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo -e "${GREEN}  ✓ $file${NC}"
            else
                echo -e "${RED}  ✗ $file${NC}"
                return 1
            fi
        else
            echo -e "${RED}  ✗ $file (not found)${NC}"
            return 1
        fi
    done
    
    # Compile testbenches
    for file in "${TESTBENCH_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${YELLOW}Compiling testbench: $file${NC}"
            iverilog -g2012 -Wall -o $BUILD_DIR/$(basename $file .v)_tb.o -c $file 2>&1 | tee -a $LOG_DIR/compile.log
            if [ ${PIPESTATUS[0]} -eq 0 ]; then
                echo -e "${GREEN}  ✓ $file${NC}"
            else
                echo -e "${RED}  ✗ $file${NC}"
                return 1
            fi
        fi
    done
    
    # Create main simulation executable
    echo -e "${YELLOW}Creating main simulation executable...${NC}"
    iverilog -g2012 -Wall -o $BUILD_DIR/virtual_chip_sim \
        "${VERILOG_FILES[@]}" \
        "testbench/virtual_chip_tb.v" 2>&1 | tee -a $LOG_DIR/compile.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo -e "${GREEN}✓ Main simulation executable created${NC}"
    else
        echo -e "${RED}✗ Failed to create main simulation executable${NC}"
        return 1
    fi
}

# Function to compile for Vivado
compile_vivado() {
    echo -e "${BLUE}Compiling for Vivado...${NC}"
    
    # Create Vivado project script
    cat > $BUILD_DIR/create_vivado_project.tcl << EOF
create_project virtual_chip_signature_system . -force
set_property board_part digilentinc:arty-a7-35:part0:1.0 [current_project]
set_property target_language Verilog [current_project]

# Add source files
$(for file in "${VERILOG_FILES[@]}"; do echo "add_files -norecurse [list \"../$file\"]"; done)

# Set top module
set_property top VirtualChip [current_fileset]
set_property top_file "../VirtualChip.v" [current_fileset]

# Create constraints file
create_fileset -constrset constrs_1
add_files -fileset constrs_1 -norecurse [list "../constraints.xdc"]

# Run synthesis
launch_runs synth_1
wait_on_run synth_1

# Run implementation
launch_runs impl_1 -to_step write_bitstream
wait_on_run impl_1

# Generate reports
open_run impl_1
report_timing_summary -file timing_report.txt
report_utilization -file utilization_report.txt
EOF

    echo -e "${YELLOW}Running Vivado synthesis...${NC}"
    vivado -mode batch -source $BUILD_DIR/create_vivado_project.tcl 2>&1 | tee $LOG_DIR/vivado.log
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo -e "${GREEN}✓ Vivado synthesis completed${NC}"
    else
        echo -e "${RED}✗ Vivado synthesis failed${NC}"
        return 1
    fi
}

# Function to compile for Quartus
compile_quartus() {
    echo -e "${BLUE}Compiling for Quartus...${NC}"
    
    # Create Quartus project file
    cat > $BUILD_DIR/virtual_chip.qpf << EOF
# Quartus Prime Project File
# Virtual Chip Signature System

# Project settings
set_global_assignment -name FAMILY "Cyclone V"
set_global_assignment -name DEVICE 5CSEMA5F31C6
set_global_assignment -name TOP_LEVEL_ENTITY VirtualChip
set_global_assignment -name ORIGINAL_QUARTUS_VERSION 20.1.0
set_global_assignment -name PROJECT_CREATION_TIME_DATE "12:00:00  JANUARY 01, 2024"
set_global_assignment -name LAST_QUARTUS_VERSION 20.1.0
set_global_assignment -name PROJECT_OUTPUT_DIRECTORY output_files
set_global_assignment -name MIN_CORE_JUNCTION_TEMP 0
set_global_assignment -name MAX_CORE_JUNCTION_TEMP 85
set_global_assignment -name ERROR_CHECK_FREQUENCY_DIVISOR 1
set_global_assignment -name NOMINAL_CORE_SUPPLY_VOLTAGE 1.1V

# Add source files
$(for file in "${VERILOG_FILES[@]}"; do echo "set_global_assignment -name VERILOG_FILE ../$file"; done)

# Timing constraints
set_global_assignment -name TIMEQUEST_MULTICORNER_ANALYSIS ON
set_global_assignment -name NUM_PARALLEL_PROCESSORS 4
EOF

    echo -e "${YELLOW}Running Quartus compilation...${NC}"
    cd $BUILD_DIR
    quartus_map virtual_chip 2>&1 | tee -a ../$LOG_DIR/quartus.log
    quartus_fit virtual_chip 2>&1 | tee -a ../$LOG_DIR/quartus.log
    quartus_asm virtual_chip 2>&1 | tee -a ../$LOG_DIR/quartus.log
    quartus_sta virtual_chip 2>&1 | tee -a ../$LOG_DIR/quartus.log
    cd ..
    
    if [ -f "$BUILD_DIR/output_files/virtual_chip.sof" ]; then
        echo -e "${GREEN}✓ Quartus compilation completed${NC}"
    else
        echo -e "${RED}✗ Quartus compilation failed${NC}"
        return 1
    fi
}

# Main compilation process
main() {
    # Check compiler
    check_compiler
    
    # Clean previous build
    echo -e "${BLUE}Cleaning previous build...${NC}"
    rm -rf $BUILD_DIR/* $LOG_DIR/compile.log
    
    # Compile based on target
    case $TARGET in
        "simulation")
            compile_simulation
            ;;
        "vivado")
            compile_vivado
            ;;
        "quartus")
            compile_quartus
            ;;
    esac
    
    # Generate compilation report
    echo -e "${BLUE}Generating compilation report...${NC}"
    cat > $LOG_DIR/compilation_report.txt << EOF
Virtual Chip Signature System - Compilation Report
=================================================
Date: $(date)
Target: $TARGET
Optimization Level: $OPT_LEVEL
Compiler: $COMPILER

Files Compiled:
$(for file in "${VERILOG_FILES[@]}"; do echo "  - $file"; done)

Testbenches:
$(for file in "${TESTBENCH_FILES[@]}"; do echo "  - $file"; done)

Build Directory: $BUILD_DIR
Log Directory: $LOG_DIR

Status: $(if [ $? -eq 0 ]; then echo "SUCCESS"; else echo "FAILED"; fi)
EOF

    echo -e "${GREEN}✓ Compilation report saved to $LOG_DIR/compilation_report.txt${NC}"
    echo -e "${GREEN}=== Compilation Complete ===${NC}"
}

# Run main function
main "$@" 