# Makefile for Virtual Chip Signature System
# Provides build automation for simulation, synthesis, and testing
# Author: Virtual Chip Signature System

# Configuration
PROJECT_NAME = virtual_chip_signature_system
TOP_MODULE = VirtualChip
TESTBENCH = virtual_chip_tb

# Directories
BUILD_DIR = build
SIM_DIR = simulation
LOG_DIR = logs
WAVE_DIR = waves
REPORT_DIR = reports

# Verilog source files (in dependency order)
VERILOG_SOURCES = \
	Modular_Arithmetic.v \
	AXI_Interface.v \
	ECDSA_Key_Config.v \
	Nonce_Handler.v \
	Keccak256_Module.v \
	ECDSA_Signer.v \
	ECDSA_Verifier.v \
	Memory_Loader.v \
	Output_Handler.v \
	VirtualChip.v

# Testbench files
TESTBENCH_SOURCES = \
	testbench/virtual_chip_tb.v \
	testbench/ecdsa_tb.v \
	testbench/chip_tb.v

# All source files
ALL_SOURCES = $(VERILOG_SOURCES) $(TESTBENCH_SOURCES)

# Compiler and tools
IVERILOG = iverilog
VVP = vvp
GTKWAVE = gtkwave
VIVADO = vivado
QUARTUS_MAP = quartus_map
QUARTUS_FIT = quartus_fit
QUARTUS_ASM = quartus_asm
QUARTUS_STA = quartus_sta

# Compiler flags
IVERILOG_FLAGS = -g2012 -Wall -Wno-timescale
VIVADO_FLAGS = -mode batch
QUARTUS_FLAGS = --64bit

# Default target
.PHONY: all
all: simulation

# Create necessary directories
$(BUILD_DIR) $(SIM_DIR) $(LOG_DIR) $(WAVE_DIR) $(REPORT_DIR):
	mkdir -p $@

# Simulation targets
.PHONY: simulation sim
simulation sim: $(SIM_DIR) $(LOG_DIR) $(WAVE_DIR)
	@echo "=== Building simulation ==="
	$(IVERILOG) $(IVERILOG_FLAGS) -o $(SIM_DIR)/$(PROJECT_NAME)_sim \
		$(VERILOG_SOURCES) testbench/virtual_chip_tb.v
	@echo "✓ Simulation build complete"

.PHONY: run-sim
run-sim: simulation
	@echo "=== Running simulation ==="
	$(VVP) $(SIM_DIR)/$(PROJECT_NAME)_sim -lxt2
	@if [ -f dump.vcd ]; then mv dump.vcd $(WAVE_DIR)/simulation.vcd; fi
	@echo "✓ Simulation complete"

.PHONY: wave
wave: run-sim
	@echo "=== Opening waveform viewer ==="
	@if command -v $(GTKWAVE) >/dev/null 2>&1; then \
		$(GTKWAVE) $(WAVE_DIR)/simulation.vcd & \
	else \
		echo "Warning: GTKWave not found. Install with: sudo apt-get install gtkwave"; \
	fi

# Individual module tests
.PHONY: test-ecdsa
test-ecdsa: $(SIM_DIR) $(LOG_DIR)
	@echo "=== Testing ECDSA module ==="
	$(IVERILOG) $(IVERILOG_FLAGS) -o $(SIM_DIR)/ecdsa_test \
		Modular_Arithmetic.v ECDSA_Signer.v testbench/ecdsa_tb.v
	$(VVP) $(SIM_DIR)/ecdsa_test
	@echo "✓ ECDSA test complete"

.PHONY: test-keccak
test-keccak: $(SIM_DIR) $(LOG_DIR)
	@echo "=== Testing Keccak module ==="
	$(IVERILOG) $(IVERILOG_FLAGS) -o $(SIM_DIR)/keccak_test \
		Keccak256_Module.v
	@echo "✓ Keccak test complete"

# Vivado synthesis targets
.PHONY: vivado-synth
vivado-synth: $(BUILD_DIR) $(LOG_DIR)
	@echo "=== Running Vivado synthesis ==="
	@if command -v $(VIVADO) >/dev/null 2>&1; then \
		$(VIVADO) $(VIVADO_FLAGS) -source synthesis.tcl; \
	else \
		echo "Error: Vivado not found. Please install Xilinx Vivado."; \
		exit 1; \
	fi
	@echo "✓ Vivado synthesis complete"

# Quartus synthesis targets
.PHONY: quartus-synth
quartus-synth: $(BUILD_DIR) $(LOG_DIR)
	@echo "=== Running Quartus synthesis ==="
	@if command -v $(QUARTUS_MAP) >/dev/null 2>&1; then \
		cd $(BUILD_DIR) && \
		$(QUARTUS_MAP) $(QUARTUS_FLAGS) $(PROJECT_NAME) && \
		$(QUARTUS_FIT) $(QUARTUS_FLAGS) $(PROJECT_NAME) && \
		$(QUARTUS_ASM) $(QUARTUS_FLAGS) $(PROJECT_NAME) && \
		$(QUARTUS_STA) $(QUARTUS_FLAGS) $(PROJECT_NAME); \
	else \
		echo "Error: Quartus not found. Please install Intel Quartus."; \
		exit 1; \
	fi
	@echo "✓ Quartus synthesis complete"

# Linting and syntax checking
.PHONY: lint
lint: $(LOG_DIR)
	@echo "=== Running syntax check ==="
	@for file in $(VERILOG_SOURCES); do \
		echo "Checking $$file..."; \
		$(IVERILOG) $(IVERILOG_FLAGS) -E $$file -o /dev/null 2>&1 || \
		(echo "✗ Syntax error in $$file"; exit 1); \
	done
	@echo "✓ All files passed syntax check"

# Code coverage
.PHONY: coverage
coverage: $(REPORT_DIR)
	@echo "=== Running code coverage ==="
	$(IVERILOG) $(IVERILOG_FLAGS) -DCOVERAGE -o $(SIM_DIR)/coverage_sim \
		$(VERILOG_SOURCES) testbench/virtual_chip_tb.v
	$(VVP) $(SIM_DIR)/coverage_sim
	@echo "✓ Coverage analysis complete"

# Performance testing
.PHONY: performance
performance: $(REPORT_DIR)
	@echo "=== Running performance tests ==="
	@echo "Starting performance benchmark..."
	@time $(VVP) $(SIM_DIR)/$(PROJECT_NAME)_sim > $(LOG_DIR)/performance.log 2>&1
	@echo "✓ Performance test complete"

# Documentation generation
.PHONY: docs
docs: $(REPORT_DIR)
	@echo "=== Generating documentation ==="
	@echo "Generating module documentation..."
	@for file in $(VERILOG_SOURCES); do \
		echo "Processing $$file..."; \
		head -20 $$file | grep -E "^//|^module" >> $(REPORT_DIR)/modules.txt; \
	done
	@echo "✓ Documentation generated"

# Clean targets
.PHONY: clean
clean:
	@echo "=== Cleaning build artifacts ==="
	rm -rf $(BUILD_DIR) $(SIM_DIR) $(LOG_DIR) $(WAVE_DIR) $(REPORT_DIR)
	rm -f *.vcd *.lxt2 *.fst *.o *.so *.a *.exe sim dump.vcd waveform.vcd
	rm -f *.jou *.log *.str *.xpr *.xdc *.tcl
	rm -f *.qpf *.qsf *.qdf *.qws *.qar *.sof *.pof *.rbf
	rm -f *.tmp *.bak *~ .DS_Store Thumbs.db
	find . -type d -empty -delete 2>/dev/null || true
	@echo "✓ Clean complete"

.PHONY: clean-sim
clean-sim:
	@echo "=== Cleaning simulation files ==="
	rm -rf $(SIM_DIR) $(WAVE_DIR)
	rm -f *.vcd *.lxt2 *.fst sim dump.vcd waveform.vcd
	@echo "✓ Simulation clean complete"

.PHONY: clean-build
clean-build:
	@echo "=== Cleaning build files ==="
	rm -rf $(BUILD_DIR) $(LOG_DIR) $(REPORT_DIR)
	@echo "✓ Build clean complete"

# Help target
.PHONY: help
help:
	@echo "Virtual Chip Signature System - Makefile Help"
	@echo "============================================="
	@echo ""
	@echo "Available targets:"
	@echo "  all              - Build simulation (default)"
	@echo "  simulation/sim   - Build simulation executable"
	@echo "  run-sim          - Run simulation"
	@echo "  wave             - Run simulation and open waveform viewer"
	@echo "  test-ecdsa       - Test ECDSA module only"
	@echo "  test-keccak      - Test Keccak module only"
	@echo "  vivado-synth     - Run Vivado synthesis"
	@echo "  quartus-synth    - Run Quartus synthesis"
	@echo "  lint             - Run syntax checking"
	@echo "  coverage         - Run code coverage analysis"
	@echo "  performance      - Run performance tests"
	@echo "  docs             - Generate documentation"
	@echo "  clean            - Clean all build artifacts"
	@echo "  clean-sim        - Clean simulation files only"
	@echo "  clean-build      - Clean build files only"
	@echo "  help             - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make             # Build and run simulation"
	@echo "  make wave        # Run simulation and view waveforms"
	@echo "  make lint        # Check syntax of all files"
	@echo "  make clean       # Clean all files"

# Dependencies
$(SIM_DIR)/$(PROJECT_NAME)_sim: $(VERILOG_SOURCES) testbench/virtual_chip_tb.v | $(SIM_DIR)

# Phony targets for files that don't exist
.PHONY: $(VERILOG_SOURCES) $(TESTBENCH_SOURCES)

# Error handling
.DELETE_ON_ERROR:

# Default target
.DEFAULT_GOAL := all 