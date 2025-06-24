// config.v - Configuration parameters for Virtual Chip Signature System
// Global defines and parameters for all modules
// Author: Virtual Chip Signature System

`ifndef CONFIG_V
`define CONFIG_V

// ============================================================================
// PROJECT CONFIGURATION
// ============================================================================

// Project version
`define PROJECT_VERSION "1.0.0"
`define PROJECT_NAME "Virtual_Chip_Signature_System"

// ============================================================================
// CRYPTOGRAPHIC PARAMETERS
// ============================================================================

// secp256k1 curve parameters
`define SECP256K1_P 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
`define SECP256K1_N 256'hFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
`define SECP256K1_GX 256'h79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
`define SECP256K1_GY 256'h483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8

// ECDSA signature parameters
`define SIGNATURE_R_BITS 256
`define SIGNATURE_S_BITS 256
`define RECOVERY_ID_BITS 8
`define SIGNATURE_TOTAL_BITS 520  // r + s + v

// Keccak-256 parameters
`define KECCAK_STATE_SIZE 1600
`define KECCAK_ROUNDS 24
`define KECCAK_LANE_SIZE 64
`define KECCAK_NUM_LANES 25

// ============================================================================
// INTERFACE PARAMETERS
// ============================================================================

// AXI4-Lite interface parameters
`define AXI_ADDR_WIDTH 4
`define AXI_DATA_WIDTH 32
`define AXI_STRB_WIDTH 4
`define AXI_RESP_WIDTH 2

// Register map addresses
`define REG_CONTROL 4'h0
`define REG_STATUS 4'h4
`define REG_MESSAGE_LOW 4'h8
`define REG_MESSAGE_HIGH 4'hC
`define REG_PRIVATE_KEY_LOW 4'h10
`define REG_PRIVATE_KEY_HIGH 4'h14
`define REG_SIGNATURE_R_LOW 4'h18
`define REG_SIGNATURE_R_HIGH 4'h1C
`define REG_SIGNATURE_S_LOW 4'h20
`define REG_SIGNATURE_S_HIGH 4'h24
`define REG_RECOVERY_ID 4'h28
`define REG_HASH_OUT_LOW 4'h2C
`define REG_HASH_OUT_HIGH 4'h30

// Control register bits
`define CTRL_START 0
`define CTRL_OP_SELECT_LOW 1
`define CTRL_OP_SELECT_HIGH 2
`define CTRL_RESET 3
`define CTRL_KEY_LOAD 4
`define CTRL_DATA_LOAD 5
`define CTRL_NONCE_LOAD 6
`define CTRL_FORMAT_OUTPUT 7

// Status register bits
`define STAT_BUSY 0
`define STAT_DONE 1
`define STAT_ERROR 2
`define STAT_KEY_READY 3
`define STAT_DATA_READY 4
`define STAT_NONCE_READY 5
`define STAT_OUTPUT_READY 6
`define STAT_VERIFY_VALID 7

// Operation codes
`define OP_ECDSA_SIGN 2'b00
`define OP_ECDSA_VERIFY 2'b01
`define OP_KECCAK_HASH 2'b10
`define OP_IDLE 2'b11

// ============================================================================
// TIMING PARAMETERS
// ============================================================================

// Clock frequency (Hz)
`define CLK_FREQ 100_000_000
`define CLK_PERIOD_NS 10

// Timeout parameters
`define TIMEOUT_CYCLES 16'hFFFF
`define ECDSA_TIMEOUT 16'h1000
`define KECCAK_TIMEOUT 16'h0800
`define VERIFY_TIMEOUT 16'h0800

// ============================================================================
// MEMORY PARAMETERS
// ============================================================================

// Memory configuration
`define MEMORY_DEPTH 1024
`define MEMORY_WIDTH 256
`define MEMORY_ADDR_WIDTH 10

// Buffer sizes
`define INPUT_BUFFER_SIZE 256
`define OUTPUT_BUFFER_SIZE 256
`define TEMP_BUFFER_SIZE 512

// ============================================================================
// DEBUG PARAMETERS
// ============================================================================

// Debug enable/disable
`define DEBUG_ENABLE 1
`define DEBUG_LEVEL 2  // 0=off, 1=basic, 2=detailed, 3=verbose

// Debug signals
`define DEBUG_SIGNATURE 1
`define DEBUG_HASH 1
`define DEBUG_STATE 1
`define DEBUG_TIMING 1

// ============================================================================
// SIMULATION PARAMETERS
// ============================================================================

// Simulation time scale
`define SIM_TIME_SCALE 1ns
`define SIM_PRECISION 1ps

// Test parameters
`define NUM_TEST_VECTORS 10
`define TEST_TIMEOUT_NS 10000

// ============================================================================
// SYNTHESIS PARAMETERS
// ============================================================================

// Target device
`define TARGET_DEVICE "xc7a35tcpg236-1"
`define TARGET_PACKAGE "cpg236"
`define TARGET_SPEED "-1"

// Optimization settings
`define OPTIMIZE_AREA 1
`define OPTIMIZE_SPEED 1
`define OPTIMIZE_POWER 0

// ============================================================================
// ERROR CODES
// ============================================================================

// Error codes for different failure modes
`define ERROR_NONE 8'h00
`define ERROR_INVALID_KEY 8'h01
`define ERROR_INVALID_DATA 8'h02
`define ERROR_INVALID_NONCE 8'h03
`define ERROR_SIGNATURE_FAILED 8'h04
`define ERROR_VERIFICATION_FAILED 8'h05
`define ERROR_HASH_FAILED 8'h06
`define ERROR_TIMEOUT 8'h07
`define ERROR_INVALID_OPERATION 8'h08
`define ERROR_MEMORY_ERROR 8'h09
`define ERROR_AXI_ERROR 8'h0A

// ============================================================================
// FEATURE FLAGS
// ============================================================================

// Enable/disable features
`define FEATURE_ECDSA_SIGN 1
`define FEATURE_ECDSA_VERIFY 1
`define FEATURE_KECCAK_HASH 1
`define FEATURE_AXI_INTERFACE 1
`define FEATURE_DYNAMIC_KEYS 1
`define FEATURE_DYNAMIC_DATA 1
`define FEATURE_SECURE_NONCE 1
`define FEATURE_OUTPUT_FORMATTING 1

// ============================================================================
// COMPATIBILITY PARAMETERS
// ============================================================================

// Ethereum compatibility
`define ETHEREUM_COMPATIBLE 1
`define ETHEREUM_SIGNATURE_FORMAT 1
`define ETHEREUM_ADDRESS_FORMAT 1

// Blockchain network support
`define SUPPORT_MAINNET 1
`define SUPPORT_SEPOLIA 1
`define SUPPORT_GOERLI 1

// ============================================================================
// SECURITY PARAMETERS
// ============================================================================

// Security settings
`define SECURITY_LEVEL 256
`define KEY_VALIDATION_ENABLED 1
`define SIGNATURE_VALIDATION_ENABLED 1
`define TIMING_ATTACK_PROTECTION 1

// ============================================================================
// PERFORMANCE PARAMETERS
// ============================================================================

// Performance targets
`define TARGET_SIGNATURE_TIME_NS 1000
`define TARGET_VERIFICATION_TIME_NS 1000
`define TARGET_HASH_TIME_NS 100
`define MAX_LATENCY_NS 10000

// Throughput targets
`define TARGET_SIGNATURES_PER_SEC 1000
`define TARGET_VERIFICATIONS_PER_SEC 1000
`define TARGET_HASHES_PER_SEC 10000

`endif // CONFIG_V 