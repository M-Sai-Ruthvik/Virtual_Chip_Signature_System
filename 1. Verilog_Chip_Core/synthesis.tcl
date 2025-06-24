# synthesis.tcl - Vivado synthesis script for Virtual Chip Signature System
# Implements the complete design on Xilinx FPGA with proper constraints
# Author: Virtual Chip Signature System

# Create project
create_project virtual_chip_signature_system . -force
set_property board_part digilentinc:arty-a7-35:part0:1.0 [current_project]
set_property target_language Verilog [current_project]

# Set project properties
set_property default_lib work [current_project]
set_property target_simulator XSim [current_project]
set_property -name "xsim.simulate.runtime" -value "1000ns" -objects [get_filesets sim_1]

# Add source files
add_files -norecurse [list \
    "Modular_Arithmetic.v" \
    "AXI_Interface.v" \
    "ECDSA_Key_Config.v" \
    "Nonce_Handler.v" \
    "Keccak256_Module.v" \
    "ECDSA_Signer.v" \
    "ECDSA_Verifier.v" \
    "Memory_Loader.v" \
    "Output_Handler.v" \
    "VirtualChip.v" \
]

# Set top module
set_property top VirtualChip [current_fileset]
set_property top_file "VirtualChip.v" [current_fileset]

# Create constraints file
create_fileset -constrset constrs_1
add_files -fileset constrs_1 -norecurse [list "constraints.xdc"]

# Set synthesis strategy
set_property strategy "Vivado Synthesis Defaults" [get_runs synth_1]

# Set implementation strategy
set_property strategy "Vivado Implementation Defaults" [get_runs impl_1]

# Configure synthesis settings
set_property -name "synth_design.retiming" -value "1" -objects [get_runs synth_1]
set_property -name "synth_design.resource_sharing" -value "auto" -objects [get_runs synth_1]
set_property -name "synth_design.fsm_extraction" -value "auto" -objects [get_runs synth_1]
set_property -name "synth_design.keep_equivalent_registers" -value "1" -objects [get_runs synth_1]
set_property -name "synth_design.shreg_min_size" -value "3" -objects [get_runs synth_1]

# Configure implementation settings
set_property -name "place_design.optimize_standard_timing" -value "1" -objects [get_runs impl_1]
set_property -name "place_design.auto_1" -value "1" -objects [get_runs impl_1]
set_property -name "route_design.tns_cleared_nets" -value "1" -objects [get_runs impl_1]
set_property -name "route_design.allow_delay_override" -value "1" -objects [get_runs impl_1]

# Run synthesis
puts "Starting synthesis..."
launch_runs synth_1
wait_on_run synth_1

# Check synthesis status
if {[get_property PROGRESS [get_runs synth_1]] == "100%"} {
    puts "Synthesis completed successfully"
} else {
    puts "Synthesis failed"
    exit 1
}

# Open synthesized design
open_run synth_1

# Generate synthesis reports
report_timing_summary -file synthesis_timing_report.txt
report_utilization -file synthesis_utilization_report.txt
report_power -file synthesis_power_report.txt
report_clock_interaction -file synthesis_clock_report.txt

# Run implementation
puts "Starting implementation..."
launch_runs impl_1 -to_step write_bitstream
wait_on_run impl_1

# Check implementation status
if {[get_property PROGRESS [get_runs impl_1]] == "100%"} {
    puts "Implementation completed successfully"
} else {
    puts "Implementation failed"
    exit 1
}

# Open implemented design
open_run impl_1

# Generate implementation reports
report_timing_summary -file implementation_timing_report.txt
report_utilization -file implementation_utilization_report.txt
report_power -file implementation_power_report.txt
report_route_status -file implementation_route_report.txt
report_drc -file implementation_drc_report.txt

# Generate bitstream
write_bitstream -force virtual_chip_signature_system.bit

# Generate programming files
write_cfgmem -force -format bin -interface spix4 -size 16 -loadbit "up 0x0 virtual_chip_signature_system.bit" -file virtual_chip_signature_system.bin

puts "Synthesis and implementation completed successfully!"
puts "Generated files:"
puts "  - virtual_chip_signature_system.bit (Bitstream)"
puts "  - virtual_chip_signature_system.bin (Programming file)"
puts "  - synthesis_*_report.txt (Synthesis reports)"
puts "  - implementation_*_report.txt (Implementation reports)" 