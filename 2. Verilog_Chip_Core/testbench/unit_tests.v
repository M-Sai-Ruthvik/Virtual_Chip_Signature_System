// Comprehensive Unit Testbench for Core Modules
// Virtual Chip Signature System
// Enhanced: Assertions, Waveform, Coverage, Randomization, Self-Checking, Parameterization

`timescale 1ns/1ps

module unit_tests;

    // =====================
    // Parameterization
    // =====================
    parameter CLK_PERIOD = 10;
    parameter RANDOM_TESTS = 5;

    // Clock and reset
    reg clk = 0;
    reg rst_n = 0;
    initial forever #(CLK_PERIOD/2) clk = ~clk;
    initial begin
        rst_n = 0;
        #20;
        rst_n = 1;
    end

    // =====================
    // Waveform Dumping
    // =====================
    initial begin
        $dumpfile("unit_tests.vcd");
        $dumpvars(0, unit_tests);
    end

    // =====================
    // Coverage Counters
    // =====================
    integer pass_count = 0;
    integer fail_count = 0;
    integer signer_done_covered = 0;
    integer signer_error_covered = 0;
    integer verifier_valid_covered = 0;
    integer verifier_error_covered = 0;
    integer keccak_covered = 0;
    integer mod_add_covered = 0;
    integer mod_mul_covered = 0;
    integer nonce_ready_covered = 0;
    integer nonce_error_covered = 0;

    // ========================================
    // ECDSA_Signer Test
    // ========================================
    reg [255:0] msg_in, priv_key, nonce;
    reg start_signer;
    wire [519:0] sig_out;
    wire busy_signer, done_signer, error_signer;
    integer i; // Declare loop variable at module level
    
    ECDSA_Signer signer_inst (
        .clk(clk), .rst_n(rst_n),
        .msg_in(msg_in), .priv_key(priv_key), .nonce(nonce), .start(start_signer),
        .sig_out(sig_out), .busy(busy_signer), .done(done_signer), .error(error_signer)
    );
    
    // Self-checking and assertions
    always @(posedge done_signer) begin
        signer_done_covered = signer_done_covered + 1;
        if (sig_out === 0) begin
            $error("[ECDSA_Signer] Signature output should not be zero!");
            $display("[ECDSA_Signer] FAIL: sig_out is zero");
            fail_count = fail_count + 1;
        end else begin
            $display("[ECDSA_Signer] PASS: sig_out=%h", sig_out);
            pass_count = pass_count + 1;
        end
    end
    always @(posedge error_signer) begin
        signer_error_covered = signer_error_covered + 1;
        $display("[ECDSA_Signer] FAIL: Error occurred");
        fail_count = fail_count + 1;
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
    function [511:0] random512;
        input integer seed;
        integer s;
        begin
            s = seed;
            random512 = {random256(s), random256(s+1)};
        end
    endfunction

    initial begin
        $display("[ECDSA_Signer] Test started");
        @(posedge rst_n);
        #10;
        // Test 1: Basic signing
        msg_in = 256'h0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef;
        priv_key = 256'h1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        nonce = 256'hdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef;
        start_signer = 1;
        #10;
        start_signer = 0;
        wait(done_signer || error_signer);
        #20;
        // Test 2: Edge case (all zeros)
        msg_in = 0;
        priv_key = 0;
        nonce = 0;
        start_signer = 1;
        #10;
        start_signer = 0;
        wait(done_signer || error_signer);
        #20;
        // Test 3: Edge case (all ones)
        msg_in = {256{1'b1}};
        priv_key = {256{1'b1}};
        nonce = {256{1'b1}};
        start_signer = 1;
        #10;
        start_signer = 0;
        wait(done_signer || error_signer);
        #20;
        // Test 4: Randomized
        for (i = 0; i < RANDOM_TESTS; i = i + 1) begin
            msg_in = random256(i);
            priv_key = random256(i+100);
            nonce = random256(i+200);
            start_signer = 1;
            #10;
            start_signer = 0;
            wait(done_signer || error_signer);
            #20;
        end
    end

    // ========================================
    // ECDSA_Verifier Test
    // ========================================
    reg [255:0] msg_hash, pub_key_x, pub_key_y;
    reg [511:0] signature;
    reg start_verifier;
    wire valid, busy_verifier, done_verifier, error_verifier;
    
    ECDSA_Verifier verifier_inst (
        .clk(clk), .rst_n(rst_n),
        .msg_hash(msg_hash), .signature(signature),
        .pub_key_x(pub_key_x), .pub_key_y(pub_key_y), .start(start_verifier),
        .valid(valid), .busy(busy_verifier), .done(done_verifier), .error(error_verifier)
    );
    always @(posedge valid) begin
        verifier_valid_covered = verifier_valid_covered + 1;
        $display("[ECDSA_Verifier] PASS: valid signature");
        pass_count = pass_count + 1;
    end
    always @(posedge error_verifier) begin
        verifier_error_covered = verifier_error_covered + 1;
        $display("[ECDSA_Verifier] FAIL: Error occurred");
        fail_count = fail_count + 1;
    end
    initial begin
        $display("[ECDSA_Verifier] Test started");
        @(posedge rst_n);
        #60;
        // Test 1: Use signature from signer
        msg_hash = msg_in;
        signature = sig_out[511:0];
        pub_key_x = 256'h79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
        pub_key_y = 256'h483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
        start_verifier = 1;
        #10;
        start_verifier = 0;
        wait(done_verifier || error_verifier);
        #20;
        // Test 2: Edge case (all zeros)
        msg_hash = 0;
        signature = 0;
        pub_key_x = 0;
        pub_key_y = 0;
        start_verifier = 1;
        #10;
        start_verifier = 0;
        wait(done_verifier || error_verifier);
        #20;
        // Test 3: Edge case (all ones)
        msg_hash = {256{1'b1}};
        signature = {512{1'b1}};
        pub_key_x = {256{1'b1}};
        pub_key_y = {256{1'b1}};
        start_verifier = 1;
        #10;
        start_verifier = 0;
        wait(done_verifier || error_verifier);
        #20;
        // Test 4: Randomized
        for (i = 0; i < RANDOM_TESTS; i = i + 1) begin
            msg_hash = random256(i);
            signature = random512(i+100);
            pub_key_x = random256(i+200);
            pub_key_y = random256(i+300);
            start_verifier = 1;
            #10;
            start_verifier = 0;
            wait(done_verifier || error_verifier);
            #20;
        end
    end

    // ========================================
    // Keccak256_Module Test
    // ========================================
    reg [511:0] keccak_data_in;
    reg keccak_rst;
    wire [255:0] keccak_hash_out;
    
    Keccak256_Module keccak_inst (
        .clk(clk), .rst(keccak_rst), .data_in(keccak_data_in), .hash_out(keccak_hash_out)
    );
    always @(posedge clk) begin
        if (keccak_hash_out !== 0) begin
            keccak_covered = keccak_covered + 1;
        end
    end
    initial begin
        $display("[Keccak256_Module] Test started");
        keccak_rst = 1;
        @(posedge rst_n);
        #10;
        keccak_rst = 0;
        // Test 1: Hash a simple message
        keccak_data_in = 512'hdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef;
        #20;
        $display("[Keccak256_Module] hash_out=%h", keccak_hash_out);
        // Test 2: Hash another message
        keccak_data_in = 512'h1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        #20;
        $display("[Keccak256_Module] hash_out=%h", keccak_hash_out);
        // Test 3: Edge case (all zeros)
        keccak_data_in = 0;
        #20;
        $display("[Keccak256_Module] hash_out=%h", keccak_hash_out);
        // Test 4: Edge case (all ones)
        keccak_data_in = {512{1'b1}};
        #20;
        $display("[Keccak256_Module] hash_out=%h", keccak_hash_out);
        // Test 5: Randomized
        for (i = 0; i < RANDOM_TESTS; i = i + 1) begin
            keccak_data_in = random512(i);
            #20;
            $display("[Keccak256_Module] hash_out=%h", keccak_hash_out);
        end
    end

    // ========================================
    // Modular_Arithmetic Test
    // ========================================
    reg [255:0] mod_a, mod_b, mod_modulus;
    reg [2:0] mod_operation;
    reg start_mod;
    wire [255:0] mod_result;
    wire done_mod, busy_mod, error_mod;
    
    Modular_Arithmetic mod_inst (
        .clk(clk), .rst_n(rst_n),
        .a(mod_a), .b(mod_b), .modulus(mod_modulus), .operation(mod_operation), .start(start_mod),
        .result(mod_result), .done(done_mod), .busy(busy_mod), .error(error_mod)
    );
    always @(posedge done_mod) begin
        if (mod_operation == 3'b000) mod_add_covered = mod_add_covered + 1;
        if (mod_operation == 3'b010) mod_mul_covered = mod_mul_covered + 1;
        if (mod_result !== 0) begin
            $display("[Modular_Arithmetic] PASS: result=%h", mod_result);
            pass_count = pass_count + 1;
        end else begin
            $display("[Modular_Arithmetic] FAIL: result is zero");
            fail_count = fail_count + 1;
        end
    end
    initial begin
        $display("[Modular_Arithmetic] Test started");
        @(posedge rst_n);
        #130;
        // Test 1: Modular addition
        mod_a = 256'h5;
        mod_b = 256'h7;
        mod_modulus = 256'hb;
        mod_operation = 3'b000; // MOD_ADD
        start_mod = 1;
        #10;
        start_mod = 0;
        wait(done_mod || error_mod);
        #20;
        // Test 2: Modular multiplication
        mod_a = 256'h3;
        mod_b = 256'h4;
        mod_modulus = 256'h7;
        mod_operation = 3'b010; // MOD_MUL
        start_mod = 1;
        #10;
        start_mod = 0;
        wait(done_mod || error_mod);
        #20;
        // Test 3: Edge case (all zeros)
        mod_a = 0;
        mod_b = 0;
        mod_modulus = 256'hb;
        mod_operation = 3'b000;
        start_mod = 1;
        #10;
        start_mod = 0;
        wait(done_mod || error_mod);
        #20;
        // Test 4: Edge case (all ones)
        mod_a = {256{1'b1}};
        mod_b = {256{1'b1}};
        mod_modulus = {256{1'b1}};
        mod_operation = 3'b010;
        start_mod = 1;
        #10;
        start_mod = 0;
        wait(done_mod || error_mod);
        #20;
        // Test 5: Randomized
        for (i = 0; i < RANDOM_TESTS; i = i + 1) begin
            mod_a = random256(i);
            mod_b = random256(i+100);
            mod_modulus = random256(i+200);
            mod_operation = (i % 2 == 0) ? 3'b000 : 3'b010;
            start_mod = 1;
            #10;
            start_mod = 0;
            wait(done_mod || error_mod);
            #20;
        end
    end

    // ========================================
    // Nonce_Handler Test
    // ========================================
    reg [255:0] nonce_in;
    reg nonce_valid, load_nonce;
    wire [255:0] nonce_out;
    wire nonce_ready, nonce_error;
    
    Nonce_Handler nonce_inst (
        .clk(clk), .rst_n(rst_n),
        .nonce_in(nonce_in), .nonce_valid(nonce_valid), .load_nonce(load_nonce),
        .nonce(nonce_out), .nonce_ready(nonce_ready), .nonce_error(nonce_error)
    );
    always @(posedge nonce_ready) begin
        nonce_ready_covered = nonce_ready_covered + 1;
        $display("[Nonce_Handler] PASS: nonce=%h", nonce_out);
        pass_count = pass_count + 1;
    end
    always @(posedge nonce_error) begin
        nonce_error_covered = nonce_error_covered + 1;
        $display("[Nonce_Handler] FAIL: Error occurred");
        fail_count = fail_count + 1;
    end
    initial begin
        $display("[Nonce_Handler] Test started");
        @(posedge rst_n);
        #200;
        // Test 1: Valid nonce
        nonce_in = 256'h1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        nonce_valid = 1;
        load_nonce = 1;
        #10;
        load_nonce = 0;
        nonce_valid = 0;
        wait(nonce_ready || nonce_error);
        #20;
        // Test 2: Invalid nonce (zero)
        nonce_in = 256'h0;
        nonce_valid = 1;
        load_nonce = 1;
        #10;
        load_nonce = 0;
        nonce_valid = 0;
        wait(nonce_ready || nonce_error);
        #20;
        // Test 3: Edge case (all ones)
        nonce_in = {256{1'b1}};
        nonce_valid = 1;
        load_nonce = 1;
        #10;
        load_nonce = 0;
        nonce_valid = 0;
        wait(nonce_ready || nonce_error);
        #20;
        // Test 4: Randomized
        for (i = 0; i < RANDOM_TESTS; i = i + 1) begin
            nonce_in = random256(i);
            nonce_valid = 1;
            load_nonce = 1;
            #10;
            load_nonce = 0;
            nonce_valid = 0;
            wait(nonce_ready || nonce_error);
            #20;
        end
    end

    // ========================================
    // Output_Handler Test
    // ========================================
    reg [519:0] oh_sig_in;
    reg [255:0] oh_hash_in, oh_pub_key_x, oh_pub_key_y;
    reg oh_sig_valid, oh_format_output;
    wire [519:0] oh_sig_out;
    wire [255:0] oh_tx_data;
    wire oh_output_ready, oh_output_error;
    
    Output_Handler output_handler_inst (
        .clk(clk), .rst_n(rst_n),
        .sig_in(oh_sig_in), .hash_in(oh_hash_in),
        .pub_key_x(oh_pub_key_x), .pub_key_y(oh_pub_key_y),
        .sig_valid(oh_sig_valid), .format_output(oh_format_output),
        .sig_out(oh_sig_out), .tx_data(oh_tx_data),
        .output_ready(oh_output_ready), .output_error(oh_output_error)
    );
    initial begin
        $display("[Output_Handler] Test started");
        @(posedge rst_n);
        #20;
        // Valid signature test
        oh_sig_in = {256'h1, 256'h2, 8'd27};
        oh_hash_in = 256'h1234;
        oh_pub_key_x = 256'hA;
        oh_pub_key_y = 256'hB;
        oh_sig_valid = 1;
        oh_format_output = 1;
        #40;
        oh_format_output = 0;
        oh_sig_valid = 0;
        #40;
        $display("[Output_Handler] sig_out=%h, tx_data=%h, ready=%b, error=%b", oh_sig_out, oh_tx_data, oh_output_ready, oh_output_error);
        // Invalid signature test (zero signature)
        oh_sig_in = 0;
        oh_hash_in = 0;
        oh_pub_key_x = 0;
        oh_pub_key_y = 0;
        oh_sig_valid = 1;
        oh_format_output = 1;
        #40;
        oh_format_output = 0;
        oh_sig_valid = 0;
        #40;
        $display("[Output_Handler] (invalid) sig_out=%h, tx_data=%h, ready=%b, error=%b", oh_sig_out, oh_tx_data, oh_output_ready, oh_output_error);
    end

    // ========================================
    // Memory_Loader Test
    // ========================================
    reg [255:0] ml_data_in;
    reg ml_data_valid, ml_load_data;
    reg [9:0] ml_address;
    wire [255:0] ml_data_out, ml_formatted_data;
    wire ml_data_ready, ml_data_error;
    
    Memory_Loader memory_loader_inst (
        .clk(clk), .rst_n(rst_n),
        .data_in(ml_data_in), .data_valid(ml_data_valid), .load_data(ml_load_data), .address(ml_address),
        .data_out(ml_data_out), .data_ready(ml_data_ready), .data_error(ml_data_error), .formatted_data(ml_formatted_data)
    );
    initial begin
        $display("[Memory_Loader] Test started");
        @(posedge rst_n);
        #30;
        // Valid transaction data
        ml_data_in = 256'h1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        ml_data_valid = 1;
        ml_load_data = 1;
        ml_address = 0;
        #10;
        ml_load_data = 0;
        ml_data_valid = 0;
        #40;
        $display("[Memory_Loader] data_out=%h, formatted_data=%h, ready=%b, error=%b", ml_data_out, ml_formatted_data, ml_data_ready, ml_data_error);
        // Invalid data (all zeros)
        ml_data_in = 0;
        ml_data_valid = 1;
        ml_load_data = 1;
        ml_address = 1;
        #10;
        ml_load_data = 0;
        ml_data_valid = 0;
        #40;
        $display("[Memory_Loader] (invalid) data_out=%h, formatted_data=%h, ready=%b, error=%b", ml_data_out, ml_formatted_data, ml_data_ready, ml_data_error);
    end

    // ========================================
    // ECDSA_Key_Config Test
    // ========================================
    reg [255:0] kc_key_in;
    reg kc_key_valid, kc_load_key;
    wire [255:0] kc_priv_key, kc_pub_key_x, kc_pub_key_y;
    wire kc_key_ready, kc_key_error;
    
    ECDSA_Key_Config key_config_inst (
        .clk(clk), .rst_n(rst_n),
        .key_in(kc_key_in), .key_valid(kc_key_valid), .load_key(kc_load_key),
        .priv_key(kc_priv_key), .pub_key_x(kc_pub_key_x), .pub_key_y(kc_pub_key_y),
        .key_ready(kc_key_ready), .key_error(kc_key_error)
    );
    initial begin
        $display("[ECDSA_Key_Config] Test started");
        @(posedge rst_n);
        #40;
        // Valid key
        kc_key_in = 256'hCAFEBABE;
        kc_key_valid = 1;
        kc_load_key = 1;
        #10;
        kc_load_key = 0;
        kc_key_valid = 0;
        #20;
        $display("[ECDSA_Key_Config] priv_key=%h, pub_key_x=%h, pub_key_y=%h, ready=%b, error=%b", kc_priv_key, kc_pub_key_x, kc_pub_key_y, kc_key_ready, kc_key_error);
        // Invalid key (all zeros)
        kc_key_in = 0;
        kc_key_valid = 1;
        kc_load_key = 1;
        #10;
        kc_load_key = 0;
        kc_key_valid = 0;
        #20;
        $display("[ECDSA_Key_Config] (invalid) priv_key=%h, pub_key_x=%h, pub_key_y=%h, ready=%b, error=%b", kc_priv_key, kc_pub_key_x, kc_pub_key_y, kc_key_ready, kc_key_error);
    end

    // ========================================
    // Test Completion and Coverage Report
    // ========================================
    initial begin
        #2000;
        $display("\n====================");
        $display("Testbench Coverage Report:");
        $display("Signer done covered: %0d", signer_done_covered);
        $display("Signer error covered: %0d", signer_error_covered);
        $display("Verifier valid covered: %0d", verifier_valid_covered);
        $display("Verifier error covered: %0d", verifier_error_covered);
        $display("Keccak covered: %0d", keccak_covered);
        $display("Modular add covered: %0d", mod_add_covered);
        $display("Modular mul covered: %0d", mod_mul_covered);
        $display("Nonce ready covered: %0d", nonce_ready_covered);
        $display("Nonce error covered: %0d", nonce_error_covered);
        $display("PASS count: %0d", pass_count);
        $display("FAIL count: %0d", fail_count);
        $display("====================\n");
        $display("All unit tests completed!");
        $finish;
    end

endmodule
