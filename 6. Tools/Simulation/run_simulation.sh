#!/bin/bash

# Virtual Chip Signature System - Simulation Runner
# Comprehensive script for running Verilog simulations with various configurations
# Supports different test scenarios, waveform generation, and result analysis

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/home/ruthvik/Ruthvik/Virtual_Chip_Signature_System"
VERILOG_DIR="$PROJECT_ROOT/2. Verilog_Chip_Core"
SIM_DIR="$SCRIPT_DIR"
LOG_DIR="$SIM_DIR/logs"
RESULTS_DIR="$SIM_DIR/results"
WAVEFORM_DIR="$SIM_DIR/waveforms"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Simulation configuration
DEFAULT_SIM_TIME="1000000"  # 1ms in ps
DEFAULT_TIMESCALE="1ps/1ps"
COMPILER="iverilog"
SIMULATOR="vvp"
WAVEFORM_VIEWER="gtkwave"

# Test scenarios
declare -A TEST_SCENARIOS=(
    ["basic"]="Basic signature generation and verification"
    ["stress"]="Stress test with multiple concurrent operations"
    ["edge"]="Edge case testing with boundary values"
    ["performance"]="Performance testing with large datasets"
    ["comprehensive"]="Comprehensive test suite"
)

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] $message${NC}"
}

# Function to create directories
create_directories() {
    print_status $BLUE "Creating simulation directories..."
    
    mkdir -p "$LOG_DIR"
    mkdir -p "$RESULTS_DIR"
    mkdir -p "$WAVEFORM_DIR"
    mkdir -p "$SIM_DIR/temp"
    
    print_status $GREEN "Directories created successfully"
}

# Function to check dependencies
check_dependencies() {
    print_status $BLUE "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for Verilog compiler
    if ! command -v $COMPILER &> /dev/null; then
        missing_deps+=("$COMPILER (Icarus Verilog)")
    fi
    
    # Check for simulator
    if ! command -v $SIMULATOR &> /dev/null; then
        missing_deps+=("$SIMULATOR (Icarus Verilog)")
    fi
    
    # Check for waveform viewer
    if ! command -v $WAVEFORM_VIEWER &> /dev/null; then
        print_status $YELLOW "Warning: $WAVEFORM_VIEWER not found. Waveform viewing will be disabled."
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_status $RED "Missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install missing dependencies:"
        echo "  Ubuntu/Debian: sudo apt-get install iverilog gtkwave"
        echo "  CentOS/RHEL: sudo yum install iverilog gtkwave"
        echo "  macOS: brew install icarus-verilog gtkwave"
        exit 1
    fi
    
    print_status $GREEN "All dependencies found"
}

# Function to compile Verilog files
compile_verilog() {
    local test_name=$1
    local test_file=$2
    
    print_status $BLUE "Compiling Verilog for test: $test_name"
    
    local compile_log="$LOG_DIR/compile_${test_name}.log"
    local output_file="$SIM_DIR/temp/${test_name}.out"
    
    # Compile command
    $COMPILER -o "$output_file" \
        -I"$VERILOG_DIR" \
        -D"SIMULATION" \
        -D"TIMESCALE=$DEFAULT_TIMESCALE" \
        -D"SIM_TIME=$DEFAULT_SIM_TIME" \
        "$test_file" \
        "$VERILOG_DIR/VirtualChip.v" \
        "$VERILOG_DIR/ECDSA_Signer.v" \
        "$VERILOG_DIR/ECDSA_Verifier.v" \
        "$VERILOG_DIR/ECDSA_Key_Config.v" \
        "$VERILOG_DIR/Keccak256_Module.v" \
        "$VERILOG_DIR/Modular_Arithmetic.v" \
        "$VERILOG_DIR/Nonce_Handler.v" \
        "$VERILOG_DIR/Memory_Loader.v" \
        "$VERILOG_DIR/Output_Handler.v" \
        "$VERILOG_DIR/AXI_Interface.v" \
        "$VERILOG_DIR/config.v" \
        "$VERILOG_DIR/defines.v" \
        2>&1 | tee "$compile_log"
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "Compilation successful for $test_name"
        return 0
    else
        print_status $RED "Compilation failed for $test_name. Check log: $compile_log"
        return 1
    fi
}

# Function to run simulation
run_simulation() {
    local test_name=$1
    local sim_time=${2:-$DEFAULT_SIM_TIME}
    
    print_status $BLUE "Running simulation for test: $test_name"
    
    local sim_log="$LOG_DIR/sim_${test_name}.log"
    local output_file="$SIM_DIR/temp/${test_name}.out"
    local vcd_file="$WAVEFORM_DIR/${test_name}.vcd"
    
    # Run simulation
    $SIMULATOR "$output_file" \
        +SIM_TIME="$sim_time" \
        +VCD_FILE="$vcd_file" \
        2>&1 | tee "$sim_log"
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "Simulation completed for $test_name"
        
        # Check for VCD file
        if [ -f "$vcd_file" ]; then
            print_status $GREEN "Waveform saved to: $vcd_file"
        else
            print_status $YELLOW "Warning: No waveform file generated"
        fi
        
        return 0
    else
        print_status $RED "Simulation failed for $test_name. Check log: $sim_log"
        return 1
    fi
}

# Function to analyze simulation results
analyze_results() {
    local test_name=$1
    local sim_log="$LOG_DIR/sim_${test_name}.log"
    local results_file="$RESULTS_DIR/${test_name}_results.json"
    
    print_status $BLUE "Analyzing results for test: $test_name"
    
    # Extract key metrics from simulation log
    local total_time=$(grep -o "Total simulation time: [0-9]*" "$sim_log" | grep -o "[0-9]*" || echo "0")
    local signatures_generated=$(grep -c "Signature generated" "$sim_log" || echo "0")
    local signatures_verified=$(grep -c "Signature verified" "$sim_log" || echo "0")
    local errors=$(grep -c "ERROR\|FAIL" "$sim_log" || echo "0")
    local warnings=$(grep -c "WARNING" "$sim_log" || echo "0")
    
    # Create results JSON
    cat > "$results_file" << EOF
{
    "test_name": "$test_name",
    "timestamp": "$(date -Iseconds)",
    "simulation_time": "$total_time",
    "signatures_generated": $signatures_generated,
    "signatures_verified": $signatures_verified,
    "errors": $errors,
    "warnings": $warnings,
    "status": "$([ $errors -eq 0 ] && echo "PASS" || echo "FAIL")"
}
EOF
    
    print_status $GREEN "Results saved to: $results_file"
}

# Function to view waveform
view_waveform() {
    local test_name=$1
    local vcd_file="$WAVEFORM_DIR/${test_name}.vcd"
    
    if [ ! -f "$vcd_file" ]; then
        print_status $YELLOW "No waveform file found for $test_name"
        return 1
    fi
    
    if command -v $WAVEFORM_VIEWER &> /dev/null; then
        print_status $BLUE "Opening waveform viewer for $test_name"
        $WAVEFORM_VIEWER "$vcd_file" &
    else
        print_status $YELLOW "Waveform viewer not available. VCD file: $vcd_file"
    fi
}

# Function to run comprehensive test suite
run_comprehensive_test() {
    print_status $BLUE "Running comprehensive test suite..."
    
    local test_files=(
        "testbench/chip_tb.v"
        "testbench/ecdsa_tb.v"
        "testbench/virtual_chip_tb.v"
        "testbench/unit_tests.v"
    )
    
    local total_tests=${#test_files[@]}
    local passed_tests=0
    local failed_tests=0
    
    for test_file in "${test_files[@]}"; do
        local test_name=$(basename "$test_file" .v)
        local full_path="$PROJECT_ROOT/2. Verilog_Chip_Core/$test_file"
        print_status $YELLOW "DEBUG: Looking for testbench at: $full_path"
        if [ ! -f "$full_path" ]; then
            print_status $YELLOW "Test file not found: $full_path"
            continue
        fi
        
        print_status $BLUE "Running test: $test_name"
        
        if compile_verilog "$test_name" "$full_path" && run_simulation "$test_name"; then
            analyze_results "$test_name"
            passed_tests=$((passed_tests + 1))
            print_status $GREEN "Test $test_name PASSED"
        else
            failed_tests=$((failed_tests + 1))
            print_status $RED "Test $test_name FAILED"
        fi
        
        echo ""
    done
    
    # Summary
    print_status $BLUE "Test Suite Summary:"
    echo "  Total tests: $total_tests"
    echo "  Passed: $passed_tests"
    echo "  Failed: $failed_tests"
    echo "  Success rate: $((passed_tests * 100 / total_tests))%"
    
    if [ $failed_tests -eq 0 ]; then
        print_status $GREEN "All tests passed!"
        return 0
    else
        print_status $RED "Some tests failed!"
        return 1
    fi
}

# Function to run specific test scenario
run_test_scenario() {
    local scenario=$1
    local sim_time=${2:-$DEFAULT_SIM_TIME}
    
    if [ ! "${TEST_SCENARIOS[$scenario]}" ]; then
        print_status $RED "Unknown test scenario: $scenario"
        echo "Available scenarios:"
        for key in "${!TEST_SCENARIOS[@]}"; do
            echo "  $key: ${TEST_SCENARIOS[$key]}"
        done
        exit 1
    fi
    
    print_status $BLUE "Running test scenario: $scenario"
    print_status $BLUE "Description: ${TEST_SCENARIOS[$scenario]}"
    
    # Create scenario-specific test file
    local test_file="$SIM_DIR/temp/${scenario}_test.v"
    generate_scenario_test "$scenario" "$test_file"
    
    local test_name="${scenario}_test"
    
    if compile_verilog "$test_name" "$test_file" && run_simulation "$test_name" "$sim_time"; then
        analyze_results "$test_name"
        view_waveform "$test_name"
        print_status $GREEN "Scenario $scenario completed successfully"
        return 0
    else
        print_status $RED "Scenario $scenario failed"
        return 1
    fi
}

# Function to generate scenario-specific test files
generate_scenario_test() {
    local scenario=$1
    local output_file=$2
    
    case $scenario in
        "basic")
            cat > "$output_file" << 'EOF'
`timescale 1ps/1ps

module basic_test;
    // Basic test for signature generation and verification
    reg clk, rst_n, start;
    wire done, valid;
    wire [255:0] signature_r, signature_s;
    
    VirtualChip chip(
        .clk(clk),
        .rst_n(rst_n),
        .start(start),
        .done(done),
        .valid(valid),
        .signature_r(signature_r),
        .signature_s(signature_s)
    );
    
    initial begin
        clk = 0;
        rst_n = 0;
        start = 0;
        
        #100 rst_n = 1;
        #50 start = 1;
        #10 start = 0;
        
        wait(done);
        #100;
        
        if (valid) begin
            $display("Basic test PASSED");
        end else begin
            $display("Basic test FAILED");
        end
        
        $finish;
    end
    
    always #5 clk = ~clk;
endmodule
EOF
            ;;
        "stress")
            cat > "$output_file" << 'EOF'
`timescale 1ps/1ps

module stress_test;
    // Stress test with multiple operations
    reg clk, rst_n;
    reg [7:0] test_count;
    wire done, valid;
    wire [255:0] signature_r, signature_s;
    
    VirtualChip chip(
        .clk(clk),
        .rst_n(rst_n),
        .start(test_count < 10),
        .done(done),
        .valid(valid),
        .signature_r(signature_r),
        .signature_s(signature_s)
    );
    
    initial begin
        clk = 0;
        rst_n = 0;
        test_count = 0;
        
        #100 rst_n = 1;
        
        repeat(10) begin
            wait(done);
            if (valid) begin
                $display("Stress test %0d PASSED", test_count);
            end else begin
                $display("Stress test %0d FAILED", test_count);
            end
            test_count = test_count + 1;
            #50;
        end
        
        $display("Stress test completed");
        $finish;
    end
    
    always #5 clk = ~clk;
endmodule
EOF
            ;;
        *)
            print_status $RED "Unknown scenario: $scenario"
            exit 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo "Virtual Chip Signature System - Simulation Runner"
    echo ""
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  comprehensive    Run comprehensive test suite"
    echo "  scenario <name>  Run specific test scenario"
    echo "  clean           Clean all generated files"
    echo "  help            Show this help message"
    echo ""
    echo "Test Scenarios:"
    for key in "${!TEST_SCENARIOS[@]}"; do
        echo "  $key: ${TEST_SCENARIOS[$key]}"
    done
    echo ""
    echo "Options:"
    echo "  -t, --time <ms>  Simulation time in milliseconds"
    echo "  -v, --view       Automatically open waveform viewer"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 comprehensive"
    echo "  $0 scenario basic"
    echo "  $0 scenario stress -t 5000"
}

# Function to clean generated files
clean_files() {
    print_status $BLUE "Cleaning generated files..."
    
    rm -rf "$LOG_DIR"/*
    rm -rf "$RESULTS_DIR"/*
    rm -rf "$WAVEFORM_DIR"/*
    rm -rf "$SIM_DIR/temp"/*
    
    print_status $GREEN "Clean completed"
}

# Main execution
main() {
    # Parse command line arguments
    local command=""
    local scenario=""
    local sim_time="$DEFAULT_SIM_TIME"
    local auto_view=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            comprehensive)
                command="comprehensive"
                shift
                ;;
            scenario)
                command="scenario"
                scenario="$2"
                shift 2
                ;;
            clean)
                command="clean"
                shift
                ;;
            help|--help|-h)
                show_help
                exit 0
                ;;
            -t|--time)
                sim_time="$2"
                shift 2
                ;;
            -v|--view)
                auto_view=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Default command
    if [ -z "$command" ]; then
        command="comprehensive"
    fi
    
    # Execute command
    case $command in
        comprehensive)
            create_directories
            check_dependencies
            run_comprehensive_test
            ;;
        scenario)
            if [ -z "$scenario" ]; then
                print_status $RED "No scenario specified"
                show_help
                exit 1
            fi
            create_directories
            check_dependencies
            run_test_scenario "$scenario" "$sim_time"
            ;;
        clean)
            clean_files
            ;;
        *)
            print_status $RED "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
