module Keccak256_Module (
    input wire clk,
    input wire rst,
    input wire [511:0] data_in,
    output reg [255:0] hash_out
);
    // Internal state for the Keccak algorithm
    reg [1599:0] state;
    reg [255:0] hash;

    // Keccak parameters
    localparam integer ROUNDS = 24;
    localparam integer LANE_SIZE = 64;
    localparam integer NUM_LANES = 25;

    // Round constants
    reg [LANE_SIZE-1:0] round_constants [0:ROUNDS-1];

    // Rho offsets - fixed array declaration
    reg [5:0] rho_offsets [0:24];

    // Initialize round constants and rho offsets
    initial begin
        // Rho offsets initialization
        rho_offsets[0] = 6'd0;   rho_offsets[1] = 6'd1;   rho_offsets[2] = 6'd62;  rho_offsets[3] = 6'd28;  rho_offsets[4] = 6'd27;
        rho_offsets[5] = 6'd36;  rho_offsets[6] = 6'd44;  rho_offsets[7] = 6'd6;    rho_offsets[8] = 6'd55;  rho_offsets[9] = 6'd20;
        rho_offsets[10] = 6'd3;  rho_offsets[11] = 6'd10; rho_offsets[12] = 6'd43; rho_offsets[13] = 6'd25; rho_offsets[14] = 6'd39;
        rho_offsets[15] = 6'd41; rho_offsets[16] = 6'd45; rho_offsets[17] = 6'd15; rho_offsets[18] = 6'd21; rho_offsets[19] = 6'd8;
        rho_offsets[20] = 6'd18; rho_offsets[21] = 6'd2;  rho_offsets[22] = 6'd61; rho_offsets[23] = 6'd56; rho_offsets[24] = 6'd14;
        
        // Round constants initialization
        round_constants[0] = 64'h0000000000000001;
        round_constants[1] = 64'h0000000000008082;
        round_constants[2] = 64'h800000000000808A;
        round_constants[3] = 64'h8000000080008000;
        round_constants[4] = 64'h000000000000808B;
        round_constants[5] = 64'h0000000080000001;
        round_constants[6] = 64'h8000000080008081;
        round_constants[7] = 64'h8000000000008009;
        round_constants[8] = 64'h000000000000008A;
        round_constants[9] = 64'h0000000000000088;
        round_constants[10] = 64'h0000000080008009;
        round_constants[11] = 64'h000000008000000A;
        round_constants[12] = 64'h000000008000808B;
        round_constants[13] = 64'h800000000000008B;
        round_constants[14] = 64'h8000000000008089;
        round_constants[15] = 64'h8000000000008003;
        round_constants[16] = 64'h8000000000008002;
        round_constants[17] = 64'h8000000000000080;
        round_constants[18] = 64'h000000000000800A;
        round_constants[19] = 64'h800000008000000A;
        round_constants[20] = 64'h8000000080008081;
        round_constants[21] = 64'h8000000000008080;
        round_constants[22] = 64'h0000000080000001;
        round_constants[23] = 64'h8000000080008008;
    end

    // Function to rotate left by a fixed amount (for rho step)
    function [LANE_SIZE-1:0] rotate_left;
        input [LANE_SIZE-1:0] data;
        input [5:0] shift;
        reg [LANE_SIZE-1:0] result;
        begin
            case (shift)
                6'd0:  result = data;
                6'd1:  result = {data[LANE_SIZE-2:0], data[LANE_SIZE-1]};
                6'd2:  result = {data[LANE_SIZE-3:0], data[LANE_SIZE-1:LANE_SIZE-2]};
                6'd3:  result = {data[LANE_SIZE-4:0], data[LANE_SIZE-1:LANE_SIZE-3]};
                6'd6:  result = {data[LANE_SIZE-7:0], data[LANE_SIZE-1:LANE_SIZE-6]};
                6'd8:  result = {data[LANE_SIZE-9:0], data[LANE_SIZE-1:LANE_SIZE-8]};
                6'd10: result = {data[LANE_SIZE-11:0], data[LANE_SIZE-1:LANE_SIZE-10]};
                6'd14: result = {data[LANE_SIZE-15:0], data[LANE_SIZE-1:LANE_SIZE-14]};
                6'd15: result = {data[LANE_SIZE-16:0], data[LANE_SIZE-1:LANE_SIZE-15]};
                6'd18: result = {data[LANE_SIZE-19:0], data[LANE_SIZE-1:LANE_SIZE-18]};
                6'd20: result = {data[LANE_SIZE-21:0], data[LANE_SIZE-1:LANE_SIZE-20]};
                6'd21: result = {data[LANE_SIZE-22:0], data[LANE_SIZE-1:LANE_SIZE-21]};
                6'd25: result = {data[LANE_SIZE-26:0], data[LANE_SIZE-1:LANE_SIZE-25]};
                6'd27: result = {data[LANE_SIZE-28:0], data[LANE_SIZE-1:LANE_SIZE-27]};
                6'd28: result = {data[LANE_SIZE-29:0], data[LANE_SIZE-1:LANE_SIZE-28]};
                6'd36: result = {data[LANE_SIZE-37:0], data[LANE_SIZE-1:LANE_SIZE-36]};
                6'd39: result = {data[LANE_SIZE-40:0], data[LANE_SIZE-1:LANE_SIZE-39]};
                6'd41: result = {data[LANE_SIZE-42:0], data[LANE_SIZE-1:LANE_SIZE-41]};
                6'd43: result = {data[LANE_SIZE-44:0], data[LANE_SIZE-1:LANE_SIZE-43]};
                6'd44: result = {data[LANE_SIZE-45:0], data[LANE_SIZE-1:LANE_SIZE-44]};
                6'd45: result = {data[LANE_SIZE-46:0], data[LANE_SIZE-1:LANE_SIZE-45]};
                6'd55: result = {data[LANE_SIZE-56:0], data[LANE_SIZE-1:LANE_SIZE-55]};
                6'd56: result = {data[LANE_SIZE-57:0], data[LANE_SIZE-1:LANE_SIZE-56]};
                6'd61: result = {data[LANE_SIZE-62:0], data[LANE_SIZE-1:LANE_SIZE-61]};
                6'd62: result = {data[LANE_SIZE-63:0], data[LANE_SIZE-1:LANE_SIZE-62]};
                default: result = data;
            endcase
            rotate_left = result;
        end
    endfunction

    // Keccak permutation function
    task keccak_permutation(input [1599:0] in_state, output [1599:0] out_state);
        integer i, x, y;
        reg [1599:0] A;
        reg [1599:0] B;
        reg [LANE_SIZE-1:0] C [0:4];
        reg [LANE_SIZE-1:0] D [0:4];
        reg [LANE_SIZE-1:0] lane_data;
        reg [5:0] rho_offset;
        begin
            A = in_state;
            for (i = 0; i < ROUNDS; i = i + 1) begin
                // Theta step
                for (x = 0; x < 5; x = x + 1) begin
                    C[x] = A[x] ^ A[x+5] ^ A[x+10] ^ A[x+15] ^ A[x+20];
                end
                for (x = 0; x < 5; x = x + 1) begin
                    D[x] = C[(x+4)%5] ^ {C[(x+1)%5][LANE_SIZE-2:0], C[(x+1)%5][LANE_SIZE-1]};
                end
                for (x = 0; x < 5; x = x + 1) begin
                    for (y = 0; y < 5; y = y + 1) begin
                        A[x+5*y] = A[x+5*y] ^ D[x];
                    end
                end

                // Rho and Pi steps - fixed to avoid variable part-selects
                for (x = 0; x < 5; x = x + 1) begin
                    for (y = 0; y < 5; y = y + 1) begin
                        lane_data = A[x+5*y];
                        rho_offset = rho_offsets[x+5*y];
                        B[y+5*((2*x+3*y)%5)] = rotate_left(lane_data, rho_offset);
                    end
                end

                // Chi step
                for (x = 0; x < 5; x = x + 1) begin
                    for (y = 0; y < 5; y = y + 1) begin
                        A[x+5*y] = B[x+5*y] ^ ((~B[(x+1)%5+5*y]) & B[(x+2)%5+5*y]);
                    end
                end

                // Iota step
                A[0] = A[0] ^ round_constants[i];
            end
            out_state = A;
        end
    endtask

    // Initial block to reset the state
    initial begin
        state = 0;
        hash = 0;
    end

    // Always block to compute the hash
    always @(posedge clk or posedge rst) begin
        if (rst) begin
            state <= 0;
            hash <= 0;
            hash_out <= 0;
        end else begin
            // Absorb the input data into the state
            state[511:0] <= data_in;
            // Apply the Keccak permutation
            keccak_permutation(state, state);
            // Extract the hash from the state
            hash <= state[255:0];
            hash_out <= hash;
        end
    end
endmodule
