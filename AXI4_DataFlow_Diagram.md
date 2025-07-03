# AXI4 Interface Dataflow Diagram
## Virtual Chip Signature System

## Text-Based Dataflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL MASTER (CPU/FPGA)                            │
│                                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │   WRITE     │    │   READ      │    │   STATUS    │    │   CONTROL   │       │
│  │  REQUEST    │    │  REQUEST    │    │   CHECK     │    │   COMMAND   │       │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘       │
│         │                   │                   │                   │           │
│         ▼                   ▼                   ▼                   ▼           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  AXI4-Lite  │    │  AXI4-Lite  │    │  AXI4-Lite  │    │  AXI4-Lite  │       │
│  │   WRITE     │    │    READ     │    │    READ     │    │   WRITE     │       │
│  │  CHANNELS   │    │   CHANNELS  │    │   CHANNELS  │    │  CHANNELS   │       │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AXI4-LITE SLAVE INTERFACE                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    AXI_Interface Module                                 │    │
│  │                                                                         │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │    │
│  │  │   WRITE ADDR    │  │   WRITE DATA    │  │   WRITE RESP    │          │    │
│  │  │   HANDLER       │  │   HANDLER       │  │   HANDLER       │          │    │
│  │  │                 │  │                 │  │                 │          │    │
│  │  │ • awaddr[3:0]   │  │ • wdata[31:0]   │  │ • bresp[1:0]    │          │    │
│  │  │ • awvalid       │  │ • wstrb[3:0]    │  │ • bvalid        │          │    │
│  │  │ • awready       │  │ • wvalid        │  │ • bready        │          │    │
│  │  │                 │  │ • wready        │  │                 │          │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │    │
│  │                                                                         │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │    │
│  │  │   READ ADDR     │  │   READ DATA     │  │   REGISTER      │          │    │
│  │  │   HANDLER       │  │   HANDLER       │  │   MAPPER        │          │    │
│  │  │                 │  │                 │  │                 │          │    │
│  │  │ • araddr[3:0]   │  │ • rdata[31:0]   │  │ • reg_control   │          │    │
│  │  │ • arvalid       │  │ • rresp[1:0]    │  │ • reg_status    │          │    │
│  │  │ • arready       │  │ • rvalid        │  │ • reg_data_in   │          │    │
│  │  │                 │  │ • rready        │  │ • reg_data_out  │          │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           REGISTER MAP (16 BYTES)                               │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   0x00      │  │   0x04      │  │   0x08      │  │   0x0C      │             │
│  │  CONTROL    │  │   STATUS    │  │ DATA INPUT  │  │ DATA OUTPUT │             │
│  │  REGISTER   │  │  REGISTER   │  │  REGISTER   │  │  REGISTER   │             │
│  │             │  │             │  │             │  │             │             │
│  │ [31:3] = 0  │  │ [31:3] = 0  │  │ [31:0] =    │  │ [31:0] =    │             │
│  │ [2:1] =     │  │ [2] = error │  │ msg_in[31:0]│  │ sig_out[31:0]│            │
│  │ op_select   │  │ [1] = done  │  │             │  │             │             │
│  │ [0] = start │  │ [0] = busy  │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        INTERNAL CONTROL SIGNALS                                 │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   start_op  │  │  op_select  │  │   msg_in    │  │   key_in    │             │
│  │   (1-bit)   │  │   (2-bit)   │  │  (256-bit)  │  │  (256-bit)  │             │
│  │             │  │             │  │             │  │             │             │
│  │ • Triggers  │  │ • 00: ECDSA │  │ • Message   │  │ • Private   │             │
│  │   operation │  │   Sign      │  │   to hash   │  │   key       │             │
│  │ • Auto-clear│  │ • 01: ECDSA │  │ • From AXI  │  │ • From AXI  │             │
│  │   after 1   │  │   Verify    │  │   register  │  │   register  │             │
│  │   cycle     │  │ • 10: Keccak│  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CRYPTOGRAPHIC CORE MODULES                               │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   ECDSA     │  │   ECDSA     │  │  Keccak256  │  │  Modular    │             │
│  │  SIGNER     │  │  VERIFIER   │  │   MODULE    │  │ Arithmetic  │             │
│  │             │  │             │  │             │  │             │             │
│  │ • Input:    │  │ • Input:    │  │ • Input:    │  │ • Input:    │             │
│  │   msg_in    │  │   signature │  │   msg_in    │  │   operands  │             │
│  │   priv_key  │  │   pub_key   │  │             │  │   modulus   │             │
│  │   nonce     │  │   msg_hash  │  │ • Output:   │  │             │             │
│  │             │  │             │  │   hash_out  │  │ • Output:   │             │
│  │ • Output:   │  │ • Output:   │  │   (256-bit) │  │   result    │             │
│  │   sig_out   │  │   valid     │  │             │  │   (256-bit) │             │
│  │   (520-bit) │  │   (1-bit)   │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           STATUS FEEDBACK LOOP                                  │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    busy     │  │    done     │  │   error     │  │   sig_out   │             │
│  │   (1-bit)   │  │   (1-bit)   │  │   (1-bit)   │  │  (256-bit)  │             │
│  │             │  │             │  │             │  │             │             │
│  │ • Operation │  │ • Operation │  │ • Operation │  │ • Signature │             │
│  │   in        │  │   completed │  │   failed    │  │   output    │             │
│  │   progress  │  │   successfully│  │             │  │ • Available │           │
│  │             │  │             │  │             │  │   for read  │             │
│  │             │  │             │  │             │  │   via AXI   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Mermaid Flowchart

```mermaid
flowchart TD
    %% External Master
    A[External Master<br/>CPU/FPGA] --> B[AXI4-Lite Interface]
    
    %% AXI Interface Components
    B --> C[Write Address Handler]
    B --> D[Write Data Handler]
    B --> E[Write Response Handler]
    B --> F[Read Address Handler]
    B --> G[Read Data Handler]
    
    %% Register Map
    C --> H[Register Mapper]
    D --> H
    F --> H
    
    H --> I[Control Register<br/>0x00]
    H --> J[Status Register<br/>0x04]
    H --> K[Data Input Register<br/>0x08]
    H --> L[Data Output Register<br/>0x0C]
    
    %% Internal Control Signals
    I --> M[start_op]
    I --> N[op_select]
    K --> O[msg_in]
    K --> P[key_in]
    
    %% Cryptographic Core
    M --> Q[Operation Controller]
    N --> Q
    O --> R[Keccak256 Module]
    P --> S[ECDSA Signer]
    
    Q --> T{Operation Type}
    T -->|00| S
    T -->|01| U[ECDSA Verifier]
    T -->|10| R
    
    %% Core Modules
    R --> V[hash_out]
    S --> W[sig_out]
    U --> X[verify_valid]
    
    %% Status Feedback
    S --> Y[busy]
    S --> Z[done]
    S --> AA[error]
    
    U --> Y
    U --> Z
    U --> AA
    
    %% Status Register Update
    Y --> J
    Z --> J
    AA --> J
    
    %% Output Register Update
    W --> L
    V --> L
    
    %% Read Response
    J --> G
    L --> G
    G --> A
    
    %% Write Response
    E --> A
    
    %% Styling
    classDef masterClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef axiClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef registerClass fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef cryptoClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef statusClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class A masterClass
    class B,C,D,E,F,G axiClass
    class I,J,K,L registerClass
    class R,S,U cryptoClass
    class Y,Z,AA statusClass
```

## AXI4 Handshake Protocol

### Write Transaction
```mermaid
sequenceDiagram
    participant M as Master
    participant S as Slave
    
    Note over M,S: Write Address Phase
    M->>S: awaddr, awvalid
    S->>M: awready
    Note over M,S: Write Data Phase
    M->>S: wdata, wstrb, wvalid
    S->>M: wready
    Note over M,S: Write Response Phase
    S->>M: bresp, bvalid
    M->>S: bready
```

### Read Transaction
```mermaid
sequenceDiagram
    participant M as Master
    participant S as Slave
    
    Note over M,S: Read Address Phase
    M->>S: araddr, arvalid
    S->>M: arready
    Note over M,S: Read Data Phase
    S->>M: rdata, rresp, rvalid
    M->>S: rready
```

## Register Bit Definitions

### Control Register (0x00)
```
Bits 31:3  - Reserved (0)
Bits 2:1   - op_select
            00: ECDSA Sign
            01: ECDSA Verify
            10: Keccak256 Hash
            11: Reserved
Bit  0     - start_op (1=start, auto-clears)
```

### Status Register (0x04)
```
Bits 31:3  - Reserved (0)
Bit  2     - error (1=operation failed)
Bit  1     - done (1=operation completed)
Bit  0     - busy (1=operation in progress)
```

### Data Input Register (0x08)
```
Bits 31:0  - msg_in[31:0] (lower 32 bits of message)
```

### Data Output Register (0x0C)
```
Bits 31:0  - sig_out[31:0] or hash_out[31:0] (lower 32 bits of result)
```

## Error Handling

### AXI Response Codes
- `00` (OKAY): Successful transfer
- `01` (EXOKAY): Exclusive access successful
- `10` (SLVERR): Slave error (operation failed)
- `11` (DECERR): Decode error (invalid address)

### Error Scenarios
1. **Invalid Address**: Returns `DECERR` response
2. **Operation Failure**: Sets error bit in status register
3. **Timeout**: Master can detect via busy bit stuck high
4. **Invalid Operation**: Returns `SLVERR` response
