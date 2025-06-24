# constraints.xdc - FPGA constraints for Virtual Chip Signature System
# Timing and pin constraints for Xilinx Artix-7 FPGA
# Author: Virtual Chip Signature System

# ============================================================================
# CLOCK CONSTRAINTS
# ============================================================================

# Primary clock (100 MHz)
create_clock -period 10.000 -name clk -waveform {0.000 5.000} [get_ports clk]

# Clock uncertainty
set_clock_uncertainty 0.100 [get_clocks clk]

# ============================================================================
# PIN CONSTRAINTS
# ============================================================================

# Clock input
set_property PACKAGE_PIN W5 [get_ports clk]
set_property IOSTANDARD LVCMOS33 [get_ports clk]

# Reset input (active low)
set_property PACKAGE_PIN U18 [get_ports rst_n]
set_property IOSTANDARD LVCMOS33 [get_ports rst_n]

# AXI4-Lite Interface Pins
# Write Address Channel
set_property PACKAGE_PIN V17 [get_ports {s_axi_awaddr[0]}]
set_property PACKAGE_PIN V16 [get_ports {s_axi_awaddr[1]}]
set_property PACKAGE_PIN W16 [get_ports {s_axi_awaddr[2]}]
set_property PACKAGE_PIN W17 [get_ports {s_axi_awaddr[3]}]
set_property PACKAGE_PIN W15 [get_ports s_axi_awvalid]
set_property PACKAGE_PIN V15 [get_ports s_axi_awready]

# Write Data Channel
set_property PACKAGE_PIN W14 [get_ports {s_axi_wdata[0]}]
set_property PACKAGE_PIN W13 [get_ports {s_axi_wdata[1]}]
set_property PACKAGE_PIN W12 [get_ports {s_axi_wdata[2]}]
set_property PACKAGE_PIN W11 [get_ports {s_axi_wdata[3]}]
set_property PACKAGE_PIN V11 [get_ports {s_axi_wdata[4]}]
set_property PACKAGE_PIN V10 [get_ports {s_axi_wdata[5]}]
set_property PACKAGE_PIN W10 [get_ports {s_axi_wdata[6]}]
set_property PACKAGE_PIN W9 [get_ports {s_axi_wdata[7]}]
set_property PACKAGE_PIN V9 [get_ports {s_axi_wdata[8]}]
set_property PACKAGE_PIN W8 [get_ports {s_axi_wdata[9]}]
set_property PACKAGE_PIN W7 [get_ports {s_axi_wdata[10]}]
set_property PACKAGE_PIN W6 [get_ports {s_axi_wdata[11]}]
set_property PACKAGE_PIN U16 [get_ports {s_axi_wdata[12]}]
set_property PACKAGE_PIN E19 [get_ports {s_axi_wdata[13]}]
set_property PACKAGE_PIN U19 [get_ports {s_axi_wdata[14]}]
set_property PACKAGE_PIN V19 [get_ports {s_axi_wdata[15]}]
set_property PACKAGE_PIN W18 [get_ports {s_axi_wdata[16]}]
set_property PACKAGE_PIN U15 [get_ports {s_axi_wdata[17]}]
set_property PACKAGE_PIN U14 [get_ports {s_axi_wdata[18]}]
set_property PACKAGE_PIN V14 [get_ports {s_axi_wdata[19]}]
set_property PACKAGE_PIN V13 [get_ports {s_axi_wdata[20]}]
set_property PACKAGE_PIN V12 [get_ports {s_axi_wdata[21]}]
set_property PACKAGE_PIN U11 [get_ports {s_axi_wdata[22]}]
set_property PACKAGE_PIN U10 [get_ports {s_axi_wdata[23]}]
set_property PACKAGE_PIN U9 [get_ports {s_axi_wdata[24]}]
set_property PACKAGE_PIN U8 [get_ports {s_axi_wdata[25]}]
set_property PACKAGE_PIN V8 [get_ports {s_axi_wdata[26]}]
set_property PACKAGE_PIN U7 [get_ports {s_axi_wdata[27]}]
set_property PACKAGE_PIN V7 [get_ports {s_axi_wdata[28]}]
set_property PACKAGE_PIN V6 [get_ports {s_axi_wdata[29]}]
set_property PACKAGE_PIN U6 [get_ports {s_axi_wdata[30]}]
set_property PACKAGE_PIN V5 [get_ports {s_axi_wdata[31]}]

set_property PACKAGE_PIN U5 [get_ports s_axi_wvalid]
set_property PACKAGE_PIN V4 [get_ports s_axi_wready]

# Write Response Channel
set_property PACKAGE_PIN U4 [get_ports {s_axi_bresp[0]}]
set_property PACKAGE_PIN V3 [get_ports {s_axi_bresp[1]}]
set_property PACKAGE_PIN U3 [get_ports s_axi_bvalid]
set_property PACKAGE_PIN V2 [get_ports s_axi_bready]

# Read Address Channel
set_property PACKAGE_PIN U2 [get_ports {s_axi_araddr[0]}]
set_property PACKAGE_PIN V1 [get_ports {s_axi_araddr[1]}]
set_property PACKAGE_PIN U1 [get_ports {s_axi_araddr[2]}]
set_property PACKAGE_PIN V0 [get_ports {s_axi_araddr[3]}]
set_property PACKAGE_PIN U0 [get_ports s_axi_arvalid]
set_property PACKAGE_PIN V20 [get_ports s_axi_arready]

# Read Data Channel
set_property PACKAGE_PIN W20 [get_ports {s_axi_rdata[0]}]
set_property PACKAGE_PIN W19 [get_ports {s_axi_rdata[1]}]
set_property PACKAGE_PIN W13 [get_ports {s_axi_rdata[2]}]
set_property PACKAGE_PIN W12 [get_ports {s_axi_rdata[3]}]
set_property PACKAGE_PIN W11 [get_ports {s_axi_rdata[4]}]
set_property PACKAGE_PIN V11 [get_ports {s_axi_rdata[5]}]
set_property PACKAGE_PIN V10 [get_ports {s_axi_rdata[6]}]
set_property PACKAGE_PIN W10 [get_ports {s_axi_rdata[7]}]
set_property PACKAGE_PIN W9 [get_ports {s_axi_rdata[8]}]
set_property PACKAGE_PIN V9 [get_ports {s_axi_rdata[9]}]
set_property PACKAGE_PIN W8 [get_ports {s_axi_rdata[10]}]
set_property PACKAGE_PIN W7 [get_ports {s_axi_rdata[11]}]
set_property PACKAGE_PIN W6 [get_ports {s_axi_rdata[12]}]
set_property PACKAGE_PIN U16 [get_ports {s_axi_rdata[13]}]
set_property PACKAGE_PIN E19 [get_ports {s_axi_rdata[14]}]
set_property PACKAGE_PIN U19 [get_ports {s_axi_rdata[15]}]
set_property PACKAGE_PIN V19 [get_ports {s_axi_rdata[16]}]
set_property PACKAGE_PIN W18 [get_ports {s_axi_rdata[17]}]
set_property PACKAGE_PIN U15 [get_ports {s_axi_rdata[18]}]
set_property PACKAGE_PIN U14 [get_ports {s_axi_rdata[19]}]
set_property PACKAGE_PIN V14 [get_ports {s_axi_rdata[20]}]
set_property PACKAGE_PIN V13 [get_ports {s_axi_rdata[21]}]
set_property PACKAGE_PIN V12 [get_ports {s_axi_rdata[22]}]
set_property PACKAGE_PIN U11 [get_ports {s_axi_rdata[23]}]
set_property PACKAGE_PIN U10 [get_ports {s_axi_rdata[24]}]
set_property PACKAGE_PIN U9 [get_ports {s_axi_rdata[25]}]
set_property PACKAGE_PIN U8 [get_ports {s_axi_rdata[26]}]
set_property PACKAGE_PIN V8 [get_ports {s_axi_rdata[27]}]
set_property PACKAGE_PIN U7 [get_ports {s_axi_rdata[28]}]
set_property PACKAGE_PIN V7 [get_ports {s_axi_rdata[29]}]
set_property PACKAGE_PIN V6 [get_ports {s_axi_rdata[30]}]
set_property PACKAGE_PIN U6 [get_ports {s_axi_rdata[31]}]

set_property PACKAGE_PIN V5 [get_ports {s_axi_rresp[0]}]
set_property PACKAGE_PIN U5 [get_ports {s_axi_rresp[1]}]
set_property PACKAGE_PIN V4 [get_ports s_axi_rvalid]
set_property PACKAGE_PIN U4 [get_ports s_axi_rready]

# Set IOSTANDARD for all AXI signals
set_property IOSTANDARD LVCMOS33 [get_ports s_axi_*]

# ============================================================================
# TIMING CONSTRAINTS
# ============================================================================

# Input delay for AXI signals
set_input_delay -clock clk -max 2.000 [get_ports s_axi_*]
set_input_delay -clock clk -min 0.500 [get_ports s_axi_*]

# Output delay for AXI signals
set_output_delay -clock clk -max 2.000 [get_ports s_axi_*]
set_output_delay -clock clk -min 0.500 [get_ports s_axi_*]

# False paths for asynchronous signals
set_false_path -from [get_ports rst_n]

# ============================================================================
# AREA CONSTRAINTS
# ============================================================================

# Set maximum utilization
set_property CONTAIN_ROUTING true [get_cells -hierarchical]

# ============================================================================
# POWER CONSTRAINTS
# ============================================================================

# Set power optimization
set_property POWER_OPTIMIZATION true [get_cells -hierarchical]

# ============================================================================
# PHYSICAL CONSTRAINTS
# ============================================================================

# Set placement constraints for critical modules
set_property LOC SLICE_X0Y0 [get_cells -hierarchical -filter {NAME =~ "*ecdsa*"}]
set_property LOC SLICE_X0Y50 [get_cells -hierarchical -filter {NAME =~ "*keccak*"}]
set_property LOC SLICE_X0Y100 [get_cells -hierarchical -filter {NAME =~ "*axi*"}]

# ============================================================================
# DEBUG CONSTRAINTS
# ============================================================================

# Mark debug nets (if using ILA)
# set_property MARK_DEBUG true [get_nets -hierarchical -filter {NAME =~ "*debug*"}] 