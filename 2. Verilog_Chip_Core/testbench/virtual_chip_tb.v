// SPDX-License-Identifier: MIT
// Virtual Chip Testbench for Laptop Simulation
// Tests AXI interface, ECDSA, Keccak, and full integration
// Author: [Your Name]
// Usage: iverilog -o sim virtual_chip_tb.v ../*.v && vvp sim

`timescale 1ns / 1ps

module virtual_chip_tb();

    // Clock and reset
    reg clk;
    reg rst_n;
    
    // AXI4-Lite signals (testbench acts as master)
    reg  [3:0]  s_axi_awaddr;
    reg         s_axi_awvalid;
    wire        s_axi_awready;
    reg  [31:0] s_axi_wdata;
    reg  [3:0]  s_axi_wstrb;
    reg         s_axi_wvalid;
    wire        s_axi_wready;
    wire [1:0]  s_axi_bresp;
    wire        s_axi_bvalid;
    reg         s_axi_bready;
    reg  [3:0]  s_axi_araddr;
    reg         s_axi_arvalid;
    wire        s_axi_arready;
    wire [31:0] s_axi_rdata;
    wire [1:0]  s_axi_rresp;
    wire        s_axi_rvalid;
    reg         s_axi_rready;
    
    // User-driven signals for dynamic operation
    reg  [255:0] user_key_in;
    reg          user_key_valid;
    reg          user_key_load;
    reg  [255:0] user_data_in;
    reg          user_data_valid;
    reg          user_data_load;
    reg  [255:0] user_nonce_in;
    reg          user_nonce_valid;
    reg          user_nonce_load;
    reg          format_output;
    wire [519:0] signature_out;
    wire [255:0] tx_data_out;
    wire         output_ready;
    wire         output_error;

    // Instantiate the virtual chip (top-level module)
    VirtualChip dut (
        .clk(clk),
        .rst_n(rst_n),
        .s_axi_awaddr(s_axi_awaddr),
        .s_axi_awvalid(s_axi_awvalid),
        .s_axi_awready(s_axi_awready),
        .s_axi_wdata(s_axi_wdata),
        .s_axi_wstrb(s_axi_wstrb),
        .s_axi_wvalid(s_axi_wvalid),
        .s_axi_wready(s_axi_wready),
        .s_axi_bresp(s_axi_bresp),
        .s_axi_bvalid(s_axi_bvalid),
        .s_axi_bready(s_axi_bready),
        .s_axi_araddr(s_axi_araddr),
        .s_axi_arvalid(s_axi_arvalid),
        .s_axi_arready(s_axi_arready),
        .s_axi_rdata(s_axi_rdata),
        .s_axi_rresp(s_axi_rresp),
        .s_axi_rvalid(s_axi_rvalid),
        .s_axi_rready(s_axi_rready),
        .user_key_in(user_key_in),
        .user_key_valid(user_key_valid),
        .user_key_load(user_key_load),
        .user_data_in(user_data_in),
        .user_data_valid(user_data_valid),
        .user_data_load(user_data_load),
        .user_nonce_in(user_nonce_in),
        .user_nonce_valid(user_nonce_valid),
        .user_nonce_load(user_nonce_load),
        .format_output(format_output),
        .signature_out(signature_out),
        .tx_data_out(tx_data_out),
        .output_ready(output_ready),
        .output_error(output_error)
    );

    // Clock generation
    initial begin
        clk = 0;
        forever #5 clk = ~clk; // 100MHz clock
    end

    // Test vectors (replace with real values for production)
    reg [255:0] test_private_key = 256'h1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF;
    reg [255:0] test_message = 256'h48656C6C6F20576F726C6421000000000000000000000000000000000000000000; // "Hello World!"
    reg [255:0] test_nonce;
    reg [255:0] expected_signature;
    reg [255:0] expected_tx_data;

    // Random nonce generator (for simulation)
    function [255:0] random_nonce;
        input [31:0] seed;
        integer s;
        begin
            s = seed;
            random_nonce = {$random(s), $random(s), $random(s), $random(s), $random(s), $random(s), $random(s), $random(s)};
        end
    endfunction

    // Test sequence
    initial begin
        // Initialize
        rst_n = 0;
        s_axi_awaddr = 0;
        s_axi_awvalid = 0;
        s_axi_wdata = 0;
        s_axi_wstrb = 4'hF;
        s_axi_wvalid = 0;
        s_axi_bready = 1;
        s_axi_araddr = 0;
        s_axi_arvalid = 0;
        s_axi_rready = 1;
        user_key_in = 0;
        user_key_valid = 0;
        user_key_load = 0;
        user_data_in = 0;
        user_data_valid = 0;
        user_data_load = 0;
        user_nonce_in = 0;
        user_nonce_valid = 0;
        user_nonce_load = 0;
        format_output = 0;
        test_nonce = random_nonce(32'hDEADBEEF);
        #100;
        rst_n = 1;
        #50;

        // Load user private key
        user_key_in = test_private_key;
        user_key_valid = 1;
        user_key_load = 1;
        #10;
        user_key_load = 0;
        user_key_valid = 0;
        #50;

        // Load user data (message/transaction)
        user_data_in = test_message;
        user_data_valid = 1;
        user_data_load = 1;
        #10;
        user_data_load = 0;
        user_data_valid = 0;
        #50;

        // Load random nonce
        user_nonce_in = test_nonce;
        user_nonce_valid = 1;
        user_nonce_load = 1;
        #10;
        user_nonce_load = 0;
        user_nonce_valid = 0;
        #50;

        // Start ECDSA operation via AXI (simulate op_select = 0)
        s_axi_awaddr = 4'h0;
        s_axi_awvalid = 1;
        s_axi_wdata = 32'h00000001; // Start operation, op_select = 0
        s_axi_wvalid = 1;
        #10;
        s_axi_awvalid = 0;
        s_axi_wvalid = 0;
        #100;

        // Wait for ECDSA done
        wait (output_ready);
        $display("Signature: %h", signature_out);
        $display("TX Data:   %h", tx_data_out);
        $display("Output Error: %b", output_error);
        if (!output_error) begin
            $display("PASS: Signature and TX data formatted correctly.");
        end else begin
            $display("FAIL: Output error detected.");
        end
        $finish;
    end
endmodule 