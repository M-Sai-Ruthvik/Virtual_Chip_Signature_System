// SPDX-License-Identifier: MIT
// VirtualChip.v - Top-level integration of the Virtual Chip Signature System
// Implements correct flow: Address/Message → Keccak256 → ECDSA
// Instantiates and connects all core modules
// Author: [Your Name]

module VirtualChip (
    input  wire         clk,
    input  wire         rst_n,
    // AXI4-Lite slave interface
    input  wire [3:0]   s_axi_awaddr,
    input  wire         s_axi_awvalid,
    output wire         s_axi_awready,
    input  wire [31:0]  s_axi_wdata,
    input  wire [3:0]   s_axi_wstrb,
    input  wire         s_axi_wvalid,
    output wire         s_axi_wready,
    output wire [1:0]   s_axi_bresp,
    output wire         s_axi_bvalid,
    input  wire         s_axi_bready,
    input  wire [3:0]   s_axi_araddr,
    input  wire         s_axi_arvalid,
    output wire         s_axi_arready,
    output wire [31:0]  s_axi_rdata,
    output wire [1:0]   s_axi_rresp,
    output wire         s_axi_rvalid,
    input  wire         s_axi_rready,
    // New user-driven ports for dynamic operation
    input  wire [255:0] user_key_in,
    input  wire         user_key_valid,
    input  wire         user_key_load,
    input  wire [255:0] user_data_in,
    input  wire         user_data_valid,
    input  wire         user_data_load,
    input  wire [255:0] user_nonce_in,
    input  wire         user_nonce_valid,
    input  wire         user_nonce_load,
    input  wire         format_output,
    // Verifier-specific ports
    input  wire [255:0] verify_msg_hash,
    input  wire [511:0] verify_signature,
    input  wire [255:0] verify_pub_key_x,
    input  wire [255:0] verify_pub_key_y,
    input  wire         verify_start,
    output wire         verify_valid,
    output wire         verify_done,
    output wire         verify_error,
    // Outputs
    output wire [519:0] signature_out,
    output wire [255:0] tx_data_out,
    output wire         output_ready,
    output wire         output_error
);
    // Internal signals
    wire        start_op;
    wire [1:0]  op_select;
    wire [255:0] msg_in;
    wire [255:0] key_in;
    wire [519:0] sig_out;
    wire [255:0] hash_out;
    wire         busy;
    wire         done;
    wire         error;

    // AXI Interface (control and data registers)
    AXI_Interface axi_if (
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
        .start_op(start_op),
        .op_select(op_select),
        .msg_in(msg_in),
        .key_in(key_in),
        .sig_out(sig_out),
        .hash_out(hash_out),
        .busy(busy),
        .done(done),
        .error(error)
    );

    // ECDSA Key Config
    wire [255:0] priv_key;
    wire [255:0] pub_key_x, pub_key_y;
    wire         key_ready, key_error;
    ECDSA_Key_Config key_cfg (
        .clk(clk),
        .rst_n(rst_n),
        .key_in(user_key_in),
        .key_valid(user_key_valid),
        .load_key(user_key_load),
        .priv_key(priv_key),
        .pub_key_x(pub_key_x),
        .pub_key_y(pub_key_y),
        .key_ready(key_ready),
        .key_error(key_error)
    );

    // Nonce Handler
    wire [255:0] nonce;
    wire         nonce_ready, nonce_error;
    Nonce_Handler nonce_hdl (
        .clk(clk),
        .rst_n(rst_n),
        .nonce_in(user_nonce_in),
        .nonce_valid(user_nonce_valid),
        .load_nonce(user_nonce_load),
        .nonce(nonce),
        .nonce_ready(nonce_ready),
        .nonce_error(nonce_error)
    );

    // Keccak256 Module - Hash the input message/address
    Keccak256_Module keccak (
        .clk(clk),
        .rst(rst_n),
        .data_in({256'b0, msg_in}),
        .hash_out(hash_out)
    );

    // ECDSA Signer - Sign the hash with private key
    wire ecdsa_busy, ecdsa_done, ecdsa_error;
    ECDSA_Signer ecdsa (
        .clk(clk),
        .rst_n(rst_n),
        .msg_in(hash_out),
        .priv_key(priv_key),
        .nonce(nonce),
        .sig_out(sig_out),
        .start(start_op && (op_select == 2'b00)),
        .busy(ecdsa_busy),
        .done(ecdsa_done),
        .error(ecdsa_error)
    );

    // ECDSA Verifier - Verify signature
    wire verifier_valid, verifier_busy, verifier_done, verifier_error;
    ECDSA_Verifier verifier (
        .clk(clk),
        .rst_n(rst_n),
        .msg_hash(verify_msg_hash),
        .signature(verify_signature),
        .pub_key_x(verify_pub_key_x),
        .pub_key_y(verify_pub_key_y),
        .start(verify_start || (start_op && (op_select == 2'b01))),
        .valid(verifier_valid),
        .busy(verifier_busy),
        .done(verifier_done),
        .error(verifier_error)
    );
    assign verify_valid = verifier_valid;
    assign verify_done = verifier_done;
    assign verify_error = verifier_error;

    // Memory Loader (for user data input)
    wire [255:0] formatted_data;
    wire         data_ready, data_error;
    Memory_Loader mem_loader (
        .clk(clk),
        .rst_n(rst_n),
        .data_in(user_data_in),
        .data_valid(user_data_valid),
        .load_data(user_data_load),
        .address(10'b0), // For now, always use address 0
        .data_out(),
        .data_ready(data_ready),
        .data_error(data_error),
        .formatted_data(formatted_data)
    );

    // Output Handler (for signature formatting)
    Output_Handler out_hdl (
        .clk(clk),
        .rst_n(rst_n),
        .sig_in(sig_out),
        .hash_in(hash_out),
        .pub_key_x(pub_key_x),
        .pub_key_y(pub_key_y),
        .sig_valid(ecdsa_done),
        .format_output(format_output),
        .sig_out(signature_out),
        .tx_data(tx_data_out),
        .output_ready(output_ready),
        .output_error(output_error)
    );

    // Combined busy/done/error signals
    assign busy = ecdsa_busy || verifier_busy;
    assign done = ecdsa_done || verifier_done;
    assign error = ecdsa_error || key_error || nonce_error || data_error || verifier_error;

endmodule 