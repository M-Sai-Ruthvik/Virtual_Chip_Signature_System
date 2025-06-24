// SPDX-License-Identifier: MIT
// ECDSA_Verifier.v - ECDSA signature verification
// Verifies signatures using public key and message hash
// Author: Virtual Chip Signature System

module ECDSA_Verifier (
    input  wire         clk,
    input  wire         rst_n,
    input  wire [255:0] msg_hash,    // Message hash
    input  wire [511:0] signature,   // Signature {r, s}
    input  wire [255:0] pub_key_x,   // Public key X coordinate
    input  wire [255:0] pub_key_y,   // Public key Y coordinate
    input  wire         start,       // Start verification
    output reg          valid,       // Signature is valid
    output reg          busy,        // Verification in progress
    output reg          done,        // Verification complete
    output reg          error        // Error occurred
);

    // secp256k1 curve parameters
    localparam [255:0] P = 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F; // Prime field
    localparam [255:0] N = 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141; // Order of curve
    localparam [255:0] GX = 256'h79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798; // Generator point X
    localparam [255:0] GY = 256'h483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8; // Generator point Y

    // State machine states
    localparam IDLE = 3'b000;
    localparam VALIDATE_INPUTS = 3'b001;
    localparam CALC_W = 3'b010;
    localparam CALC_U1_U2 = 3'b011;
    localparam CALC_POINT = 3'b100;
    localparam CHECK_RESULT = 3'b101;
    localparam COMPLETE = 3'b110;
    localparam ERROR_STATE = 3'b111;

    reg [2:0] state, next_state;
    reg [255:0] r, s;
    reg [255:0] w, u1, u2;
    reg [255:0] point_x, point_y;
    reg [7:0] cycle_count;
    reg input_valid;

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
                if (start) begin
                    next_state = VALIDATE_INPUTS;
                end
            end
            
            VALIDATE_INPUTS: begin
                if (input_valid) begin
                    next_state = CALC_W;
                end else begin
                    next_state = ERROR_STATE;
                end
            end
            
            CALC_W: begin
                if (cycle_count >= 8'd30) begin // Simulated computation time
                    next_state = CALC_U1_U2;
                end else if (cycle_count > 8'hFF) begin // Timeout
                    next_state = ERROR_STATE;
                end
            end
            
            CALC_U1_U2: begin
                if (cycle_count >= 8'd60) begin // Simulated computation time
                    next_state = CALC_POINT;
                end else if (cycle_count > 8'hFF) begin // Timeout
                    next_state = ERROR_STATE;
                end
            end
            
            CALC_POINT: begin
                if (cycle_count >= 8'd90) begin // Simulated computation time
                    next_state = CHECK_RESULT;
                end else if (cycle_count > 8'hFF) begin // Timeout
                    next_state = ERROR_STATE;
                end
            end
            
            CHECK_RESULT: begin
                next_state = COMPLETE;
            end
            
            COMPLETE: begin
                next_state = IDLE;
            end
            
            ERROR_STATE: begin
                next_state = IDLE;
            end
            
            default: next_state = IDLE;
        endcase
    end

    // Output logic
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            busy <= 0;
            done <= 0;
            error <= 0;
            valid <= 0;
            r <= 0;
            s <= 0;
            w <= 0;
            u1 <= 0;
            u2 <= 0;
            point_x <= 0;
            point_y <= 0;
            input_valid <= 0;
        end else begin
            case (state)
                IDLE: begin
                    busy <= 0;
                    done <= 0;
                    error <= 0;
                    valid <= 0;
                    if (start) begin
                        busy <= 1;
                        // Extract r and s from signature
                        r <= signature[511:256];
                        s <= signature[255:0];
                    end
                end
                
                VALIDATE_INPUTS: begin
                    busy <= 1;
                    // Validate inputs: r and s must be in range [1, N-1]
                    if (r > 0 && r < N && s > 0 && s < N) begin
                        input_valid <= 1;
                    end else begin
                        input_valid <= 0;
                    end
                end
                
                CALC_W: begin
                    busy <= 1;
                    // Calculate w = s^(-1) mod N
                    if (cycle_count == 8'd29) begin
                        // Simplified: w = s (for demonstration)
                        w <= s;
                    end
                end
                
                CALC_U1_U2: begin
                    busy <= 1;
                    // Calculate u1 = (msg_hash * w) mod N
                    // Calculate u2 = (r * w) mod N
                    if (cycle_count == 8'd59) begin
                        u1 <= (msg_hash * w) % N;
                        u2 <= (r * w) % N;
                    end
                end
                
                CALC_POINT: begin
                    busy <= 1;
                    // Calculate point = u1*G + u2*Q (where Q is the public key)
                    // Simplified implementation for demonstration
                    if (cycle_count == 8'd89) begin
                        // Simplified point calculation
                        point_x <= (u1 * GX + u2 * pub_key_x) % P;
                        point_y <= (u1 * GY + u2 * pub_key_y) % P;
                    end
                end
                
                CHECK_RESULT: begin
                    busy <= 1;
                    // Check if point.x mod N == r
                    if (point_x % N == r) begin
                        valid <= 1;
                    end else begin
                        valid <= 0;
                    end
                end
                
                COMPLETE: begin
                    busy <= 0;
                    done <= 1;
                end
                
                ERROR_STATE: begin
                    busy <= 0;
                    error <= 1;
                end
            endcase
        end
    end

endmodule 