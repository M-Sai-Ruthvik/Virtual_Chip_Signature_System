// chip_tb.v
`timescale 1ns / 1ps

module chip_tb;
    // Clock and reset signals
    reg clk;
    reg rst;

    // Memory Loader signals
    reg [255:0] data_in;
    reg data_valid, load_data;
    reg [9:0] address;
    wire [255:0] data_out, formatted_data;
    wire data_ready, data_error;

    // ECDSA Signer signals
    reg [255:0] hash;
    reg [255:0] private_key;
    reg [255:0] nonce;
    reg start;
    wire [519:0] sig_out;
    wire busy, done, error;

    // Instantiate the Memory Loader
    Memory_Loader memory_loader (
        .clk(clk),
        .rst_n(rst),
        .data_in(data_in),
        .data_valid(data_valid),
        .load_data(load_data),
        .address(address),
        .data_out(data_out),
        .data_ready(data_ready),
        .data_error(data_error),
        .formatted_data(formatted_data)
    );

    // Instantiate the ECDSA Signer
    ECDSA_Signer ecdsa_signer (
        .clk(clk),
        .rst_n(rst),
        .msg_in(hash),
        .priv_key(private_key),
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
        forever #5 clk = ~clk; // 100 MHz clock
    end

    // Test sequence
    initial begin
        // Initialize signals
        rst = 1;
        address = 0;
        data_in = 0;
        data_valid = 0;
        load_data = 0;
        hash = 256'h0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef;
        private_key = 256'hfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210;
        nonce = 256'h1;
        start = 0;

        // Apply reset
        #10 rst = 0;

        // Test memory loader
        data_in = 256'hA5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5;
        data_valid = 1;
        load_data = 1;
        #10 load_data = 0;
        data_valid = 0;
        address = 1;
        #10 address = 2;

        // Test ECDSA signer
        #20 start = 1;
        #10 start = 0;
        hash = 256'habcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789;
        private_key = 256'h123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef;
        nonce = 256'h2;
        #20 start = 1;
        #10 start = 0;

        // Finish simulation
        #100 $finish;
    end

    // Monitor outputs
    initial begin
        $monitor("Time: %0t | Address: %0d | Data Out: %h | Sig Out: %h | Done: %b | Error: %b", $time, address, data_out, sig_out, done, error);
    end
endmodule