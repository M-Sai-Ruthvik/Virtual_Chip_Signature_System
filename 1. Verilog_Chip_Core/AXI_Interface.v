// SPDX-License-Identifier: MIT
// AXI4-Lite Slave Interface for Virtual Chip Signature System
// Author: [Your Name]
// Description: Provides register access for control, status, data input, and output.

module AXI_Interface #(
    parameter ADDR_WIDTH = 4,   // 16 bytes address space (4 registers)
    parameter DATA_WIDTH = 32
) (
    input  wire                  clk,
    input  wire                  rst_n,
    // AXI4-Lite slave signals
    input  wire [ADDR_WIDTH-1:0] s_axi_awaddr,
    input  wire                  s_axi_awvalid,
    output reg                   s_axi_awready,
    input  wire [DATA_WIDTH-1:0] s_axi_wdata,
    input  wire [3:0]            s_axi_wstrb,
    input  wire                  s_axi_wvalid,
    output reg                   s_axi_wready,
    output reg  [1:0]            s_axi_bresp,
    output reg                   s_axi_bvalid,
    input  wire                  s_axi_bready,
    input  wire [ADDR_WIDTH-1:0] s_axi_araddr,
    input  wire                  s_axi_arvalid,
    output reg                   s_axi_arready,
    output reg  [DATA_WIDTH-1:0] s_axi_rdata,
    output reg  [1:0]            s_axi_rresp,
    output reg                   s_axi_rvalid,
    input  wire                  s_axi_rready,

    // Integration signals to core
    output reg                   start_op,      // Start operation
    output reg  [1:0]            op_select,     // 0: ECDSA sign, 1: ECDSA verify, 2: Keccak hash
    output reg  [255:0]          msg_in,        // Message input (example: 256 bits)
    output reg  [255:0]          key_in,        // Key input (example: 256 bits)
    input  wire [255:0]          sig_out,       // Signature output
    input  wire [255:0]          hash_out,      // Hash output
    input  wire                  busy,          // Core busy
    input  wire                  done,          // Operation done
    input  wire                  error          // Error flag
);

    // Register map (offsets in bytes):
    // 0x00: Control (start, op_select)
    // 0x04: Status (busy, done, error)
    // 0x08: Data input (msg_in[31:0])
    // 0x0C: Data output (sig_out[31:0] or hash_out[31:0])

    // Internal registers
    reg [DATA_WIDTH-1:0] reg_control;
    reg [DATA_WIDTH-1:0] reg_status;
    reg [DATA_WIDTH-1:0] reg_data_in;
    reg [DATA_WIDTH-1:0] reg_data_out;

    // Write address handshake
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            s_axi_awready <= 1'b0;
        end else begin
            s_axi_awready <= ~s_axi_awready && s_axi_awvalid;
        end
    end

    // Write data handshake
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            s_axi_wready <= 1'b0;
        end else begin
            s_axi_wready <= ~s_axi_wready && s_axi_wvalid;
        end
    end

    // Write response
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            s_axi_bvalid <= 1'b0;
            s_axi_bresp  <= 2'b00;
        end else if (s_axi_awready && s_axi_awvalid && s_axi_wready && s_axi_wvalid) begin
            s_axi_bvalid <= 1'b1;
            s_axi_bresp  <= 2'b00; // OKAY
        end else if (s_axi_bvalid && s_axi_bready) begin
            s_axi_bvalid <= 1'b0;
        end
    end

    // Read address handshake
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            s_axi_arready <= 1'b0;
        end else begin
            s_axi_arready <= ~s_axi_arready && s_axi_arvalid;
        end
    end

    // Read data handshake
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            s_axi_rvalid <= 1'b0;
            s_axi_rresp  <= 2'b00;
        end else if (s_axi_arready && s_axi_arvalid) begin
            s_axi_rvalid <= 1'b1;
            s_axi_rresp  <= 2'b00; // OKAY
        end else if (s_axi_rvalid && s_axi_rready) begin
            s_axi_rvalid <= 1'b0;
        end
    end

    // Register write logic
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            reg_control <= 0;
            reg_data_in <= 0;
            start_op    <= 0;
            op_select   <= 0;
            msg_in      <= 0;
            key_in      <= 0;
        end else if (s_axi_awready && s_axi_awvalid && s_axi_wready && s_axi_wvalid) begin
            case (s_axi_awaddr)
                4'h0: begin
                    reg_control <= s_axi_wdata;
                    start_op    <= s_axi_wdata[0]; // Bit 0: start
                    op_select   <= s_axi_wdata[2:1]; // Bits 2:1: op_select
                end
                4'h8: begin
                    reg_data_in <= s_axi_wdata;
                    msg_in[31:0] <= s_axi_wdata; // Example: only lower 32 bits for now
                end
                default: ;
            endcase
        end else begin
            start_op <= 0; // Auto-clear start after one cycle
        end
    end

    // Register read logic
    always @(*) begin
        case (s_axi_araddr)
            4'h0: s_axi_rdata = reg_control;
            4'h4: s_axi_rdata = {29'b0, error, done, busy};
            4'h8: s_axi_rdata = reg_data_in;
            4'hC: s_axi_rdata = sig_out[31:0]; // Example: only lower 32 bits
            default: s_axi_rdata = 32'hDEADBEEF;
        endcase
    end

    // Status register update
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            reg_status <= 0;
        end else begin
            reg_status <= {29'b0, error, done, busy};
        end
    end

endmodule
