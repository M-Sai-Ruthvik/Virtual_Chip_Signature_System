// defines.v - Global definitions and macros for Virtual Chip Signature System
// Contains common macros, functions, and type definitions
// Author: Virtual Chip Signature System

`ifndef DEFINES_V
`define DEFINES_V

// ============================================================================
// INCLUDE GUARDS
// ============================================================================

`ifndef CONFIG_V
    `include "config.v"
`endif

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Basic type definitions
`define BYTE 7:0
`define WORD 15:0
`define DWORD 31:0
`define QWORD 63:0
`define OWORD 127:0
`define YWORD 255:0

// Cryptographic type definitions
`define PRIVATE_KEY_WIDTH 256
`define PUBLIC_KEY_WIDTH 256
`define MESSAGE_HASH_WIDTH 256
`define SIGNATURE_WIDTH 520
`define NONCE_WIDTH 256

// AXI type definitions
`define AXI_ADDR_WIDTH 4
`define AXI_DATA_WIDTH 32
`define AXI_STRB_WIDTH 4
`define AXI_RESP_WIDTH 2

// ============================================================================
// MACRO DEFINITIONS
// ============================================================================

// Clock and reset macros
`define POSEDGE_CLK posedge clk
`define NEGEDGE_RST negedge rst_n
`define RESET_COND !rst_n

// State machine macros
`define STATE_WIDTH 3
`define STATE_IDLE 3'b000
`define STATE_BUSY 3'b001
`define STATE_DONE 3'b010
`define STATE_ERROR 3'b011

// Register access macros
`define REG_READ(addr) (s_axi_araddr == addr && s_axi_arvalid)
`define REG_WRITE(addr) (s_axi_awaddr == addr && s_axi_awvalid && s_axi_wvalid)

// Bit manipulation macros
`define SET_BIT(reg, bit) (reg | (1 << bit))
`define CLEAR_BIT(reg, bit) (reg & ~(1 << bit))
`define TOGGLE_BIT(reg, bit) (reg ^ (1 << bit))
`define GET_BIT(reg, bit) ((reg >> bit) & 1)

// Field extraction macros
`define EXTRACT_FIELD(reg, high, low) (reg[high:low])
`define INSERT_FIELD(reg, high, low, value) ({reg[`EXTRACT_FIELD_WIDTH(reg)-1:high+1], value, reg[low-1:0]})

// ============================================================================
// FUNCTION MACROS
// ============================================================================

// Field width calculation
`define EXTRACT_FIELD_WIDTH(reg) $bits(reg)

// Log2 function
`define LOG2(x) ($clog2(x))

// Power of 2 check
`define IS_POWER_OF_2(x) ((x & (x - 1)) == 0)

// Minimum and maximum
`define MIN(a, b) ((a < b) ? a : b)
`define MAX(a, b) ((a > b) ? a : b)

// ============================================================================
// CRYPTOGRAPHIC MACROS
// ============================================================================

// Modular arithmetic macros
`define MOD_ADD(a, b, p) ((a + b) >= p ? (a + b - p) : (a + b))
`define MOD_SUB(a, b, p) ((a >= b) ? (a - b) : (p + a - b))
`define MOD_MUL(a, b, p) ((a * b) % p)

// Signature component extraction
`define EXTRACT_SIGNATURE_R(sig) (sig[519:264])
`define EXTRACT_SIGNATURE_S(sig) (sig[263:8])
`define EXTRACT_RECOVERY_ID(sig) (sig[7:0])

// Signature component insertion
`define INSERT_SIGNATURE_R(sig, r) ({r, sig[263:0]})
`define INSERT_SIGNATURE_S(sig, s) ({sig[519:264], s, sig[7:0]})
`define INSERT_RECOVERY_ID(sig, v) ({sig[519:8], v})

// ============================================================================
// AXI MACROS
// ============================================================================

// AXI handshake macros
`define AXI_WRITE_HANDSHAKE (s_axi_awvalid && s_axi_awready && s_axi_wvalid && s_axi_wready)
`define AXI_READ_HANDSHAKE (s_axi_arvalid && s_axi_arready)
`define AXI_RESP_HANDSHAKE (s_axi_bvalid && s_axi_bready)
`define AXI_DATA_HANDSHAKE (s_axi_rvalid && s_axi_rready)

// AXI response codes
`define AXI_RESP_OKAY 2'b00
`define AXI_RESP_EXOKAY 2'b01
`define AXI_RESP_SLVERR 2'b10
`define AXI_RESP_DECERR 2'b11

// ============================================================================
// DEBUG MACROS
// ============================================================================

// Debug print macros (only active when DEBUG_ENABLE is set)
`ifdef DEBUG_ENABLE
    `define DEBUG_PRINT(msg) $display("[DEBUG] %s", msg)
`else
    // No-op when DEBUG_ENABLE is not set
    `define DEBUG_PRINT(msg)
`endif

// Assertion macros
`define ASSERT(condition, message) \
    if (!(condition)) begin \
        $display("[ASSERTION FAILED] %s", message); \
        $finish; \
    end

`define ASSERT_WARNING(condition, message) \
    if (!(condition)) begin \
        $display("[WARNING] %s", message); \
    end

// ============================================================================
// TIMING MACROS
// ============================================================================

// Time measurement macros
`define START_TIMER \
    reg [31:0] start_time; \
    start_time = $time

`define END_TIMER \
    reg [31:0] end_time; \
    end_time = $time; \
    $display("[TIMING] Operation took %0d ns", end_time - start_time)

// ============================================================================
// MEMORY MACROS
// ============================================================================

// Memory access macros
`define MEM_READ(mem, addr) (mem[addr])
`define MEM_WRITE(mem, addr, data) (mem[addr] = data)

// Memory initialization macro
`define INIT_MEMORY(mem, size, value) \
    for (integer i = 0; i < size; i = i + 1) begin \
        mem[i] = value; \
    end

// ============================================================================
// TEST MACROS
// ============================================================================

// Test result macros
`define TEST_PASS(test_name) \
    $display("[PASS] %s", test_name)

`define TEST_FAIL(test_name, reason) \
    $display("[FAIL] %s: %s", test_name, reason)

`define TEST_SKIP(test_name, reason) \
    $display("[SKIP] %s: %s", test_name, reason)

// Test vector macros
`define LOAD_TEST_VECTOR(index) \
    $readmemh("test_vectors.mem", test_vectors, index * 5, (index + 1) * 5 - 1)

// ============================================================================
// ERROR HANDLING MACROS
// ============================================================================

// Error reporting macros
`define REPORT_ERROR(error_code, message) \
    error <= 1; \
    error_code_reg <= error_code; \
    $display("[ERROR] %s (Code: %h)", message, error_code)

`define CLEAR_ERROR \
    error <= 0; \
    error_code_reg <= `ERROR_NONE

// ============================================================================
// PERFORMANCE MACROS
// ============================================================================

// Performance measurement macros
`define START_PERF_COUNTER \
    reg [31:0] perf_start_cycles; \
    perf_start_cycles = cycle_count

`define END_PERF_COUNTER(operation) \
    reg [31:0] perf_end_cycles; \
    perf_end_cycles = cycle_count; \
    $display("[PERF] %s took %0d cycles", operation, perf_end_cycles - perf_start_cycles)

// ============================================================================
// COMPATIBILITY MACROS
// ============================================================================

// Ethereum compatibility macros
`ifdef ETHEREUM_COMPATIBLE
    `define ETHEREUM_SIGNATURE_FORMAT(sig) \
        {`EXTRACT_SIGNATURE_R(sig), `EXTRACT_SIGNATURE_S(sig), `EXTRACT_RECOVERY_ID(sig)}
    
    `define ETHEREUM_ADDRESS_FORMAT(pub_key) \
        (pub_key[159:0])
`endif

// ============================================================================
// SYNTHESIS MACROS
// ============================================================================

// Synthesis attributes
`define SYNTHESIS_ATTRIBUTE(attribute, value) \
    (* attribute = value *)

// Optimization hints
`define OPTIMIZE_AREA (* optimize_area *)
`define OPTIMIZE_SPEED (* optimize_speed *)
`define OPTIMIZE_POWER (* optimize_power *)

// ============================================================================
// SIMULATION MACROS
// ============================================================================

// Simulation control macros
`define SIM_TIMEOUT(cycles) \
    if (cycle_count > cycles) begin \
        $display("[TIMEOUT] Simulation exceeded %0d cycles", cycles); \
        $finish; \
    end

`define SIM_PROGRESS(percent) \
    if (cycle_count % (total_cycles / 10) == 0) begin \
        $display("[PROGRESS] %0d%% complete", (cycle_count * 100) / total_cycles); \
    end

`endif // DEFINES_V 