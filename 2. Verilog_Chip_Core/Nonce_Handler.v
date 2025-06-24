// SPDX-License-Identifier: MIT
// Nonce_Handler.v - Cryptographically secure nonce handler
// Accepts nonce from external RNG or testbench for ECDSA
// Author: Virtual Chip Signature System

module Nonce_Handler (
    input  wire         clk,
    input  wire         rst_n,
    input  wire [255:0] nonce_in,    // External random nonce input
    input  wire         nonce_valid, // Nonce input valid
    input  wire         load_nonce,  // Load new nonce signal
    output reg  [255:0] nonce,       // Output nonce for ECDSA
    output reg          nonce_ready, // Nonce is ready
    output reg          nonce_error  // Error if nonce is invalid
);

    // State machine states
    localparam IDLE = 2'b00;
    localparam VALIDATE = 2'b01;
    localparam READY = 2'b10;

    reg [1:0] state, next_state;
    reg [7:0] cycle_count;
    reg [255:0] temp_nonce;

    // Nonce validation function
    function is_valid_nonce;
        input [255:0] n;
        begin
            // Nonce must be nonzero and less than secp256k1 order
            is_valid_nonce = (n != 0) && (n < 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141);
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
                if (load_nonce && nonce_valid) begin
                    next_state = VALIDATE;
                end
            end
            VALIDATE: begin
                if (cycle_count >= 8'd5) begin
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

    // Output logic
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            nonce <= 0;
            nonce_ready <= 0;
            nonce_error <= 0;
            temp_nonce <= 0;
        end else begin
            case (state)
                IDLE: begin
                    nonce_ready <= 0;
                    nonce_error <= 0;
                    if (load_nonce && nonce_valid) begin
                        temp_nonce <= nonce_in;
                    end
                end
                VALIDATE: begin
                    if (cycle_count == 8'd4) begin
                        if (is_valid_nonce(temp_nonce)) begin
                            nonce_error <= 0;
                        end else begin
                            nonce_error <= 1;
                        end
                    end
                end
                READY: begin
                    if (!nonce_error) begin
                        nonce <= temp_nonce;
                        nonce_ready <= 1;
                    end
                end
            endcase
        end
    end

endmodule