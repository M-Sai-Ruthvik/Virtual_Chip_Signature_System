// SPDX-License-Identifier: MIT
// Output_Handler.v - Signature output formatting for blockchain transactions
// Formats ECDSA signatures for Ethereum/Sepolia network compatibility
// Handles signature packing and output validation
// Author: Virtual Chip Signature System

module Output_Handler (
    input  wire         clk,
    input  wire         rst_n,
    input  wire [519:0] sig_in,         // Raw signature input {r, s, v}
    input  wire [255:0] hash_in,        // Message hash input
    input  wire [255:0] pub_key_x,      // Public key X coordinate
    input  wire [255:0] pub_key_y,      // Public key Y coordinate
    input  wire         sig_valid,      // Signature is valid
    input  wire         format_output,  // Format output signal
    output reg  [519:0] sig_out,        // Formatted signature output
    output reg  [255:0] tx_data,        // Transaction data for blockchain
    output reg          output_ready,   // Output is ready
    output reg          output_error    // Output formatting error
);

    // Ethereum signature format constants
    localparam [7:0] V_27 = 8'd27;
    localparam [7:0] V_28 = 8'd28;
    localparam [7:0] V_35 = 8'd35; // For EIP-155
    localparam [7:0] V_36 = 8'd36; // For EIP-155

    // State machine states
    localparam IDLE = 2'b00;
    localparam FORMAT = 2'b01;
    localparam VALIDATE = 2'b10;
    localparam READY = 2'b11;

    reg [1:0] state, next_state;
    reg [7:0] cycle_count;
    reg [519:0] temp_sig;
    reg [255:0] temp_tx_data;
    reg [7:0] recovery_id;
    reg [519:0] formatted_sig;

    // Signature validation function
    function is_valid_signature;
        input [519:0] signature;
        input [255:0] message_hash;
        reg [255:0] r, s;
        reg [7:0] v;
        begin
            r = signature[519:264];
            s = signature[263:8];
            v = signature[7:0];
            
            // Check signature components
            is_valid_signature = (r != 0) && (s != 0) && 
                                (r < 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141) &&
                                (s < 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141) &&
                                ((v == V_27) || (v == V_28) || (v == V_35) || (v == V_36));
        end
    endfunction

    // Signature formatting function for Ethereum
    function [519:0] format_ethereum_signature;
        input [519:0] raw_sig;
        input [255:0] message_hash;
        reg [519:0] formatted;
        reg [255:0] r, s;
        reg [7:0] v;
        begin
            r = raw_sig[519:264];
            s = raw_sig[263:8];
            v = raw_sig[7:0];
            
            // Ensure s is in the lower half of the curve order
            if (s > 256'h7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) begin
                s = 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - s;
                v = (v == V_27) ? V_28 : V_27;
            end
            
            formatted = {r, s, v};
            format_ethereum_signature = formatted;
        end
    endfunction

    // Transaction data formatting function
    function [255:0] format_transaction_data;
        input [255:0] message_hash;
        input [519:0] signature;
        input [255:0] pub_x, pub_y;
        reg [255:0] formatted;
        begin
            // Format: [hash][signature_r][signature_s][recovery_id][pub_key_x][pub_key_y]
            formatted = {message_hash[255:224],     // Hash (first 32 bits)
                        signature[519:488],         // r (first 32 bits)
                        signature[263:232],         // s (first 32 bits)
                        signature[7:0],             // v (recovery ID)
                        pub_x[255:224],             // Public key X (first 32 bits)
                        pub_y[255:224]};            // Public key Y (first 32 bits)
            format_transaction_data = formatted;
        end
    endfunction

    // State machine sequential logic
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state <= IDLE;
            cycle_count <= 0;
        end else begin
            state <= next_state;
            if (state != IDLE) begin
                cycle_count <= cycle_count + 1;
            end else begin
                cycle_count <= 0;
            end
        end
    end

    // State machine combinational logic
    always @(*) begin
        next_state = state;
        case (state)
            IDLE: begin
                if (format_output && sig_valid) begin
                    next_state = FORMAT;
                end
            end
            
            FORMAT: begin
                if (cycle_count >= 8'd10) begin
                    next_state = VALIDATE;
                end else if (cycle_count > 8'hFF) begin
                    next_state = IDLE;
                end
            end
            
            VALIDATE: begin
                if (cycle_count >= 8'd15) begin
                    next_state = READY;
                end else if (cycle_count > 8'hFF) begin
                    next_state = IDLE;
                end
            end
            
            READY: begin
                next_state = IDLE;
            end
            
            default: next_state = IDLE;
        endcase
    end

    // Main logic
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            sig_out <= 0;
            tx_data <= 0;
            output_ready <= 0;
            output_error <= 0;
            temp_sig <= 0;
            temp_tx_data <= 0;
            recovery_id <= 0;
        end else begin
            case (state)
                IDLE: begin
                    output_ready <= 0;
                    output_error <= 0;
                end
                
                FORMAT: begin
                    if (cycle_count == 8'd9) begin
                        // Format signature for Ethereum compatibility
                        formatted_sig = format_ethereum_signature(sig_in, hash_in);
                        temp_sig <= formatted_sig;
                        recovery_id <= formatted_sig[7:0];
                    end
                end
                
                VALIDATE: begin
                    if (cycle_count == 8'd14) begin
                        if (is_valid_signature(temp_sig, hash_in)) begin
                            output_error <= 0;
                            // Format transaction data
                            temp_tx_data <= format_transaction_data(hash_in, temp_sig, pub_key_x, pub_key_y);
                        end else begin
                            output_error <= 1;
                        end
                    end
                end
                
                READY: begin
                    sig_out <= temp_sig;
                    tx_data <= temp_tx_data;
                    output_ready <= 1;
                    output_error <= 0;
                end
            endcase
        end
    end

endmodule