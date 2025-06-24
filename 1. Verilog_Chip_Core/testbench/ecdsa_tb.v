// SPDX-License-Identifier: MIT
// ecdsa_tb.v - Testbench for ECDSA Signer with r, s, v components
// Tests signature generation with various inputs
// Tests correct flow: Message → Keccak → ECDSA
// Author: Virtual Chip Signature System

`timescale 1ns / 1ps

module ecdsa_tb;

    // Test parameters
    reg clk;
    reg rst_n;
    reg [255:0] msg_in;
    reg [255:0] priv_key;
    reg [255:0] nonce;
    reg start;
    wire [519:0] sig_out;  // Updated to 65 bytes (r, s, v)
    wire busy, done, error;

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
        $dumpfile("ecdsa_tb.vcd");
        $dumpvars(0, ecdsa_tb);

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

        // Test Case 1: Basic signature generation with r, s, v
        $display("=== Test Case 1: Basic Signature Generation (r, s, v) ===");
        msg_in = 256'h1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF;
        priv_key = 256'hA1B2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456;
        nonce = 256'hFEDCBA0987654321FEDCBA0987654321FEDCBA0987654321FEDCBA0987654321;
        
        start = 1;
        #10;
        start = 0;

        // Wait for completion
        wait(done || error);
        if (done) begin
            $display("Signature generated successfully!");
            $display("R (32 bytes): %h", sig_out[519:264]);
            $display("S (32 bytes): %h", sig_out[263:8]);
            $display("V (1 byte):   %h", sig_out[7:0]);
            $display("Total length: 65 bytes");
        end else if (error) begin
            $display("Error occurred during signature generation!");
        end

        #50;

        // Test Case 2: Different message
        $display("=== Test Case 2: Different Message ===");
        msg_in = 256'hDEADBEEFCAFEBABEDEADBEEFCAFEBABEDEADBEEFCAFEBABEDEADBEEFCAFEBABE;
        priv_key = 256'hB2C3D4E5F6789012345678901234567890ABCDEF1234567890ABCDEF123456A1;
        nonce = 256'hBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDC;
        
        start = 1;
        #10;
        start = 0;

        wait(done || error);
        if (done) begin
            $display("Signature generated successfully!");
            $display("R (32 bytes): %h", sig_out[519:264]);
            $display("S (32 bytes): %h", sig_out[263:8]);
            $display("V (1 byte):   %h", sig_out[7:0]);
            $display("Total length: 65 bytes");
        end else if (error) begin
            $display("Error occurred during signature generation!");
        end

        #50;

        // Test Case 3: Zero inputs (should handle gracefully)
        $display("=== Test Case 3: Zero Inputs ===");
        msg_in = 0;
        priv_key = 0;
        nonce = 0;
        
        start = 1;
        #10;
        start = 0;

        wait(done || error);
        if (done) begin
            $display("Signature generated with zero inputs!");
            $display("R (32 bytes): %h", sig_out[519:264]);
            $display("S (32 bytes): %h", sig_out[263:8]);
            $display("V (1 byte):   %h", sig_out[7:0]);
        end else if (error) begin
            $display("Error occurred with zero inputs (expected)!");
        end

        #50;

        // Test Case 4: Maximum values
        $display("=== Test Case 4: Maximum Values ===");
        msg_in = 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        priv_key = 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        nonce = 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        
        start = 1;
        #10;
        start = 0;

        wait(done || error);
        if (done) begin
            $display("Signature generated with maximum values!");
            $display("R (32 bytes): %h", sig_out[519:264]);
            $display("S (32 bytes): %h", sig_out[263:8]);
            $display("V (1 byte):   %h", sig_out[7:0]);
        end else if (error) begin
            $display("Error occurred with maximum values!");
        end

        #50;

        // Test Case 5: Test v component values
        $display("=== Test Case 5: V Component Validation ===");
        msg_in = 256'h5555555555555555555555555555555555555555555555555555555555555555;
        priv_key = 256'hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;
        nonce = 256'h1111111111111111111111111111111111111111111111111111111111111111;
        
        start = 1;
        #10;
        start = 0;

        wait(done || error);
        if (done) begin
            $display("V component test completed!");
            $display("V value: %d (should be 27 or 28)", sig_out[7:0]);
            if (sig_out[7:0] == 8'd27 || sig_out[7:0] == 8'd28) begin
                $display("V component is valid for Ethereum!");
            end else begin
                $display("V component is invalid for Ethereum!");
            end
        end else if (error) begin
            $display("Error in V component test!");
        end

        #100;

        // End simulation
        $display("=== ECDSA Testbench Complete ===");
        $display("All tests completed with r, s, v signature format!");
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

    // Helper function for wide random values
    function [255:0] random256;
        input integer seed;
        integer s;
        begin
            s = seed;
            random256 = {$random(s), $random(s), $random(s), $random(s), $random(s), $random(s), $random(s), $random(s)};
        end
    endfunction

endmodule 