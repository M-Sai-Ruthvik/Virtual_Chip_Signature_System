// SPDX-License-Identifier: MIT
// Memory_Loader.v - Enhanced memory loader for dynamic data input
// Supports user-provided transaction data and message loading
// Implements proper data validation and formatting for blockchain transactions
// Author: Virtual Chip Signature System

module Memory_Loader (
    input  wire         clk,
    input  wire         rst_n,
    input  wire [255:0] data_in,        // User-provided transaction data
    input  wire         data_valid,     // Data input valid signal
    input  wire         load_data,      // Load new data signal
    input  wire [9:0]   address,        // Memory address for reading
    output reg  [255:0] data_out,       // Data output at specified address
    output reg          data_ready,     // Data is ready for processing
    output reg          data_error,     // Data validation error
    output reg  [255:0] formatted_data  // Formatted data for hashing
);

    // Memory array to hold transaction data
    reg [255:0] memory [0:1023]; // 1K x 256-bit memory
    reg [9:0] write_addr;
    reg [7:0] cycle_count;
    reg data_loaded;

    // State machine states
    localparam IDLE = 2'b00;
    localparam VALIDATE = 2'b01;
    localparam STORE = 2'b10;
    localparam READY = 2'b11;

    reg [1:0] state, next_state;

    // Transaction data structure
    reg [159:0] to_address;     // 20 bytes for recipient address
    reg [127:0] amount;         // 16 bytes for transaction amount
    reg [63:0] nonce;           // 8 bytes for transaction nonce
    reg [31:0] gas_price;       // 4 bytes for gas price
    reg [31:0] gas_limit;       // 4 bytes for gas limit

    // Data validation function
    function is_valid_transaction_data;
        input [255:0] data;
        begin
            // Check if data is not zero and has valid structure
            is_valid_transaction_data = (data != 0) && 
                                       (data[159:0] != 0) &&    // Valid recipient address
                                       (data[287:160] != 0);    // Valid amount
        end
    endfunction

    // Data formatting function for Ethereum transaction
    function [255:0] format_transaction_data;
        input [255:0] raw_data;
        reg [255:0] formatted;
        begin
            // Format: [nonce][gas_price][gas_limit][to][value][data]
            formatted = {raw_data[63:0],      // nonce
                        raw_data[95:64],      // gas_price
                        raw_data[127:96],     // gas_limit
                        raw_data[159:128],    // to address (first 32 bits)
                        raw_data[191:160],    // value (first 32 bits)
                        raw_data[223:192],    // data (first 32 bits)
                        raw_data[255:224]};   // remaining data
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
                if (load_data && data_valid) begin
                    next_state = VALIDATE;
                end
            end
            
            VALIDATE: begin
                if (cycle_count >= 8'd5) begin
                    next_state = STORE;
                end else if (cycle_count > 8'hFF) begin
                    next_state = IDLE;
                end
            end
            
            STORE: begin
                if (cycle_count >= 8'd10) begin
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
            data_out <= 0;
            data_ready <= 0;
            data_error <= 0;
            formatted_data <= 0;
            write_addr <= 0;
            data_loaded <= 0;
            
            // Initialize memory
            for (integer i = 0; i < 1024; i = i + 1) begin
                memory[i] <= 0;
            end
        end else begin
            case (state)
                IDLE: begin
                    data_ready <= 0;
                    data_error <= 0;
                    if (load_data && data_valid) begin
                        data_loaded <= 0;
                    end
                    
                    // Read data from memory at specified address
                    data_out <= memory[address];
                end
                
                VALIDATE: begin
                    if (cycle_count == 8'd4) begin
                        if (is_valid_transaction_data(data_in)) begin
                            data_error <= 0;
                            // Parse transaction components
                            to_address <= data_in[159:0];
                            amount <= data_in[287:160];
                            nonce <= data_in[351:288];
                            gas_price <= data_in[383:352];
                            gas_limit <= data_in[415:384];
                        end else begin
                            data_error <= 1;
                        end
                    end
                end
                
                STORE: begin
                    if (cycle_count == 8'd9) begin
                        // Store formatted transaction data
                        formatted_data <= format_transaction_data(data_in);
                        memory[write_addr] <= format_transaction_data(data_in);
                        write_addr <= write_addr + 1;
                        data_loaded <= 1;
                    end
                end
                
                READY: begin
                    data_ready <= 1;
                    data_error <= 0;
                end
            endcase
        end
    end

    // Load data from file (for testing purposes)
    initial begin
        // Load test transaction data if file exists
        $readmemh("test_transaction.mem", memory);
    end

endmodule