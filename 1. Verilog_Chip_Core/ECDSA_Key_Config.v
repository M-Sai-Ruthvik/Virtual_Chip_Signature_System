// SPDX-License-Identifier: MIT
// ECDSA_Key_Config.v - Stub module for ECDSA key configuration
// Replace with real implementation as needed

module ECDSA_Key_Config (
    input  wire         clk,
    input  wire         rst_n,
    input  wire [255:0] key_in,
    input  wire         key_valid,
    input  wire         load_key,
    output wire [255:0] priv_key,
    output wire [255:0] pub_key_x,
    output wire [255:0] pub_key_y,
    output wire         key_ready,
    output wire         key_error
);
    // Stub: Pass-through logic
    assign priv_key  = key_in;
    assign pub_key_x = 256'b0;
    assign pub_key_y = 256'b0;
    assign key_ready = key_valid & load_key;
    assign key_error = 1'b0;
endmodule