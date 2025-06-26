// SPDX-License-Identifier: MIT
// ecdsa_simple_tb.v - Simplified ECDSA Testbench
// Tests basic ECDSA signature generation with minimal dependencies
// Author: Virtual Chip Signature System

`timescale 1ns / 1ps

module ecdsa_simple_tb;

    // Test parameters
    reg clk;
    reg rst_n;
    reg [255:0] msg_in;
    reg [255:0] priv_key;
    reg [255:0] nonce;
    reg start;
    wire [519:0] sig_out;  // r, s, v components
    wire busy, done, error;

    reg [7:0] hash_bytes [0:31];
    integer i;

    // Instantiate ECDSA Signer
    ECDSA_Signer ecdsa_inst (
        .clk(clk),
        .rst_n(rst_n),
        .msg_in(msg_in),
        .priv_key(priv_key),
        .nonce(nonce),
        .start(start),
        .sig_out(sig_out),
        .busy(busy),
        .done(done),
        .error(error)
    );

    // Clock generation
    initial begin
        clk = 0;
        forever #5 clk = ~clk; // 100MHz clock
    end

    // Test stimulus
    initial begin
        // Initialize waveform dump
        $dumpfile("ecdsa_simple_tb.vcd");
        $dumpvars(0, ecdsa_simple_tb);

        // Initialize signals
        rst_n = 0;
        start = 0;
        msg_in = 0;
        priv_key = 0;
        nonce = 0;

        // Reset
        #20;
        rst_n = 1;
        #10;

        // Read hash from ecdsa_input.mem (written by backend)
        if ($fopen("../ecdsa_input.mem", "r")) begin
            $readmemh("../ecdsa_input.mem", hash_bytes);
            msg_in = 0;
            for (i = 0; i < 32; i = i + 1) begin
                msg_in = (msg_in << 8) | hash_bytes[i];
            end
            $display("Read hash from ecdsa_input.mem: %064x", msg_in);
        end else begin
            $display("Warning: ecdsa_input.mem not found, using default test vector");
            msg_in = 256'h1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF;
        end
        
        // Set test values
        priv_key = 256'hA1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456;
        nonce = 256'hFEDCBA0987654321FEDCBA0987654321FEDCBA0987654321FEDCBA0987654321;
        
        $display("Starting ECDSA signature generation...");
        $display("Message: %064x", msg_in);
        $display("Private Key: %064x", priv_key);
        $display("Nonce: %064x", nonce);
        
        start = 1;
        #10;
        start = 0;
        
        // Wait for completion
        wait(done || error);
        
        if (done) begin
            $display("r: %064x", sig_out[519:264]);
            $display("s: %064x", sig_out[263:8]);
            $display("v: %02x", sig_out[7:0]);
            $display("ECDSA signature generation completed successfully!");
        end else if (error) begin
            $display("Error occurred during signature generation!");
        end
        
        #100;
        $finish;
    end

    // Monitor state changes
    always @(posedge clk) begin
        if (busy) begin
            $display("Time %0t: ECDSA operation in progress", $time);
        end
        if (done) begin
            $display("Time %0t: ECDSA operation completed", $time);
        end
        if (error) begin
            $display("Time %0t: ECDSA operation failed", $time);
        end
    end

endmodule 