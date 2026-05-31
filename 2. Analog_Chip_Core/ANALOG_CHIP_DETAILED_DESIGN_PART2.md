# **Analog Cryptographic Chip - Detailed Design (Part 2)**

## **Continuing from Part 1...**

---

# **4. Keccak-256 Analog Implementation**

## **4.1 Keccak-256 Overview & Structure**

### **Why Keccak-256?**
- NIST SHA-3 standard (secure hash)
- Used in ECDSA signature generation and verification
- Fixed 256-bit output (unlike SHA-2 with variable output)
- Simple, regular structure (good for hardware)

### **Key Parameters**

```
Input:       Message of any length
Output:      256-bit hash
State:       1600 bits (25 × 64-bit lanes)
Rounds:      24 permutation rounds
Rate:        1088 bits (absorbed per iteration)
Capacity:    512 bits (security margin)
```

### **Algorithm Flow**

```
┌─────────────────────────────────────────┐
│     Input Message (any length)          │
│  e.g., 256 bits (for ECDSA)            │
└────────────────────┬────────────────────┘
                     │
          ┌──────────V──────────┐
          │  Padding            │
          │  (pad to 1088 bits) │
          └──────────┬──────────┘
                     │
┌────────────────────V──────────────────────┐
│       Initialization                      │
│  State = 1600 bits of zeros              │
└────────────────┬─────────────────────────┘
                 │
┌────────────────V──────────────────────────┐
│   Absorption Phase (1 block)             │
│                                          │
│  State ⊕= (padded message || 0...0)    │
│                                          │
│  Then run 24 rounds on state            │
└────────────────┬──────────────────────────┘
                 │
         ┌───────V────────┐
         │  For each of   │
         │  24 rounds:    │
         │                │
         │  θ (Theta)     │ (mixing across lanes)
         │  ρ (Rho)       │ (bit rotation)
         │  π (Pi)        │ (permutation)
         │  χ (Chi)       │ (nonlinear mix)
         │  ι (Iota)      │ (round constant)
         │                │
         └───────┬────────┘
                 │
┌────────────────V──────────────────────────┐
│   Squeezing Phase (Extract Output)       │
│                                          │
│  Output first 256 bits of state         │
│  Return as hash                         │
└────────────────────────────────────────────┘
```

---

## **4.2 State Representation in Analog**

### **Challenge: 1600-bit State in Analog**

**Problem**: How to store/process 1600 bits in analog circuits?

**Solution**: Hybrid analog-digital approach

```
┌─────────────────────────────────────────┐
│  1600-bit Keccak State                  │
│  = 25 lanes × 64 bits each             │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Lane 0  (64 bits) - Analog I0    │  │
│  │ Lane 1  (64 bits) - Analog I1    │  │
│  │ Lane 2  (64 bits) - Analog I2    │  │
│  │ ...                               │  │
│  │ Lane 24 (64 bits) - Analog I24   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Representation:                        │
│  Each lane stored as current: I_lane   │
│  where I_lane ∈ [0, 2^64] in units of │
│  (I_ref / 2^64) Amperes               │
│                                         │
│  Range: 0 to 10 μA (for 10 μA ref)   │
│  Resolution: 10 pA per bit (LSB)      │
└─────────────────────────────────────────┘
```

### **Storage Elements (Holding Lanes)**

Each 64-bit lane is stored in an **analog integrator** with a **large capacitor**:

```
Lane Storage Architecture:

        I_lane (input current)
          │
          V
       ┌──┴──┐
       │ M_in│ (switch to allow input)
       └──┬──┘
          │
       ┌──┴────────────────┐
       │   Op-Amp          │
       │                   │
       │   +───────────────┼──── V_lane
       │   │               │
       │   │   C = 100 pF  │
       │   │   (storage)   │
       │   │               │
       └───┴───────────────┘
       
Charge stored: Q = C × V_lane
               V_lane = (I_lane × t) / C

For 64-bit precision over ~1 μs:
C ≈ 100 pF → V per bit ≈ 100 μV (high impedance buffers needed)

Readout: V_lane → ADC → 64-bit digital value
```

---

## **4.3 Keccak Round Function (One Round)**

Each of 24 rounds applies 5 transformation functions in sequence:

### **Step 1: θ (Theta) - Cross-Lane Mixing**

#### **Purpose**
XOR each lane with nearby lanes to mix information.

#### **Mathematical Formula**

```
For each lane (x, y, z):
  C[x] = lane[x,0] ⊕ lane[x,1] ⊕ ... ⊕ lane[x,4]  (vertical slice)
  D[x] = C[x-1] ⊕ (C[x+1] <<< 1)                  (rotation)
  lane[x,y] ⊕= D[x]  (update each lane)
```

#### **Analog Implementation: XOR Operation**

**Challenge**: How to implement XOR in analog? XOR is inherently digital.

**Solution**: Use analog logic gates (differential pairs with tail switching)

```
Analog XOR (2-input):

        I_A    I_B
         │      │
         V      V
      ┌──┴──┬──┴──┐
      │ M_1 │ M_2 │ (differential pair with cross-coupling)
      └──┬──┴──┬──┘
         │      │
         ├─────┬┤
         │     ││ (cross-coupled inverter-like pair)
         │     ││
      ┌──V──┬─┴┴──┐
      │ M_3 │ M_4 │ (output stage)
      └──┬──┴──┬──┘
         │      │
        I_out+ I_out-

Boolean logic (current representation):
  if I_A > I_ref/2 XOR I_B > I_ref/2:
    I_out = I_ref
  else:
    I_out = 0
```

#### **Hardware Theta Stage**

```
┌─────────────────────────────────────────────────────────┐
│                Theta Computation                         │
│                                                          │
│  Input: 25 currents (I_lane[0] to I_lane[24])          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Step 1: Compute C[x] (column XOR)               │  │
│  │                                                  │  │
│  │ for x = 0 to 4:                                 │  │
│  │   C[x] = XOR( lane[x,0], lane[x,1], ... )     │  │
│  │                                                  │  │
│  │ Resources: 5 × (4 XOR gates) = 20 XOR gates    │  │
│  │ Time: 5 cycles (4 levels of XOR tree)          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Step 2: Compute D[x] (with rotation)            │  │
│  │                                                  │  │
│  │ for x = 0 to 4:                                 │  │
│  │   D[x] = C[x-1] ⊕ (C[x+1] <<< 1)             │  │
│  │                                                  │  │
│  │ Rotation: use multiplexer for bit rotation      │  │
│  │ (rotate current by re-mapping address)          │  │
│  │                                                  │  │
│  │ Resources: 5 × (1 XOR gate) = 5 XOR gates     │  │
│  │ Time: 3 cycles (2 levels)                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Step 3: Update each lane                         │  │
│  │                                                  │  │
│  │ for each lane[x,y]:                             │  │
│  │   lane[x,y] ⊕= D[x]                            │  │
│  │                                                  │  │
│  │ Resources: 25 × (1 XOR gate) = 25 XOR gates    │  │
│  │ Time: 2 cycles                                  │  │
│  │                                                  │  │
│  │ Update: Read lane, XOR with D, store back       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Total time for Theta: ~10 cycles                       │
│  Power: ~20 mW (lots of XOR gates switching)           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### **Step 2: ρ (Rho) - Bit Rotation**

#### **Purpose**
Rotate each lane by a fixed amount (to break symmetry).

#### **Mathematical Formula**

```
For each lane (x,y):
  offset[x,y] = (x + 3y) × (x + 1) / 2
  lane[x,y] <<= offset[x,y]  (rotate left by offset bits)
```

#### **Analog Implementation: Shift Register**

**Representation Challenge**: We have currents, not bit sequences!

**Solution**: Use address decoding for current routing

```
Bit Rotation in Current-Mode:

For a 64-bit lane as current I_lane:
- Represent as 64 parallel currents (one per bit position)
- Rotate = reroute the currents to different positions
- Use multiplexers to redirect current flow

Detailed:
  I_lane = sum(I_bit[i] for i = 0 to 63)
  
  After rotation by offset:
  I_lane' = sum(I_bit[(i + offset) mod 64] for i = 0 to 63)
  
  Hardware: 64 × 64 crossbar switch (or simpler binary tree)
  Power: Low (just routing, no computation)
  Time: 1-2 cycles (routing delay)
```

#### **Hardware Rho Stage**

```
┌─────────────────────────────────────────────────────┐
│            Rho (Rotation) Stage                      │
│                                                      │
│  Input: 25 lanes (each 64 bits as current)         │
│                                                      │
│  ┌─────────────────────────────────────────────┐  │
│  │ For each of 25 lanes:                       │  │
│  │                                              │  │
│  │ Step 1: Lookup rotation offset               │  │
│  │   offset = LUT[x,y] (precomputed ROM)       │  │
│  │   (5×5 = 25 entries)                        │  │
│  │                                              │  │
│  │ Step 2: Route current through shift mux     │  │
│  │   I_out = rotate(I_lane, offset)           │  │
│  │                                              │  │
│  │ Step 3: Store result back to lane           │  │
│  │   lane[x,y] = I_out                        │  │
│  │                                              │  │
│  │ Resources per lane: 64-input mux + logic   │  │
│  │ Total: 25 × (log2(64) ≈ 6-bit mux)         │  │
│  │ Power: ~1-2 mW (minimal)                    │  │
│  │ Time: 2-3 cycles per lane                   │  │
│  └─────────────────────────────────────────────┘  │
│                                                      │
│  Total time for Rho: ~5 cycles (can be done in     │
│  parallel for all 25 lanes if we have 25 muxes)    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

### **Step 3: π (Pi) - Lane Permutation**

#### **Purpose**
Rearrange lanes in 2D space.

#### **Mathematical Formula**

```
For each lane at position (x, y):
  newpos = (x + 3y, x)
  lane[newpos] = old_lane[x, y]

Essentially, permute 25 lanes to different positions.
```

#### **Analog Implementation: Current Multiplexer**

```
Permutation as Current Routing:

Input currents: I[0], I[1], ..., I[24]
Output permuted: I'[0], I'[1], ..., I'[24]

where I'[newpos] comes from I[oldpos]

Hardware: 25-input multiplexer per output lane
         (or 25×25 crossbar for all lanes)

Resources: 25 output switches, each selecting from 25 inputs
Power: ~5-10 mW (lots of multiplexer switching)
Time: 1-2 cycles
```

---

### **Step 4: χ (Chi) - Nonlinear Mixing**

#### **Purpose**
The only nonlinear step in Keccak! This is where the security comes from.

#### **Mathematical Formula**

```
For each lane row (fixing y):
  for x = 0 to 4:
    lane[x,y] ^= (~lane[x+1,y]) & lane[x+2,y]
    
    where ~  is bitwise NOT
          &  is bitwise AND
```

#### **Analog Implementation: AND-NOT Gate**

This is **critical** for security. Let's implement carefully.

```
Analog AND-NOT Gate:

Inputs: I_A, I_B (representing 64-bit lanes as currents)
Output: I_out = (~I_A) & I_B

This is basically: if I_A is LOW, then output I_B. Otherwise output 0.

Implementation using differential logic:

        VDD
         │
      ┌──┴──┐ ┌──┴──┐
      │ M_3 │ │ M_4 │ (output drivers)
      └──┬──┘ └──┬──┘
         │       │
         ├─────┬─┘
         │     │
      ┌──V──┐ ┌┴──┐
      │ M_1 │ │M_2│ (input switching pairs)
      └──┬──┘ └┬──┘
         │     │
    I_A ─┴─────┴─ I_B
         │
        I_bias (tail current)

Truth table (current logic):
  if I_A ≈ 0 (LOW):
    AND-NOT output connects to I_B side → I_out = I_B (HIGH)
  if I_A ≈ I_ref (HIGH):
    AND-NOT output connects to GND → I_out = 0 (LOW)
```

#### **Hardware Chi Stage**

```
┌──────────────────────────────────────────────────────┐
│          Chi (Nonlinear) Stage                        │
│                                                       │
│  Input: 25 lanes (5×5 grid)                         │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ For each row y = 0 to 4:                       │ │
│  │                                                 │ │
│  │   for x = 0 to 4:                             │ │
│  │     temp[x] = lane[x]                         │ │
│  │                                                 │ │
│  │   for x = 0 to 4:                             │ │
│  │     lane[x] ^= (~temp[x+1]) & temp[x+2]     │ │
│  │     (indices mod 5)                           │ │
│  │                                                 │ │
│  │   Resources per row: 5 AND-NOT gates          │ │
│  │   Total: 5 rows × 5 gates = 25 AND-NOT       │ │
│  │   Power: ~50 mW (highly nonlinear!)           │ │
│  │   Time: 4 cycles (fetch, compute, store)      │ │
│  │                                                 │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  Why Chi Matters for Security:                       │
│  - Only nonlinear operation in Keccak               │
│  - Provides diffusion (avalanche effect)            │
│  - Without it, Keccak would be breakable (linear)   │
│  - That AND-NOT gate is where the security lives!   │
│                                                       │
│  Total time for Chi: ~6 cycles                       │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

### **Step 5: ι (Iota) - Round Constant Addition**

#### **Purpose**
Add round-dependent constants to break symmetry between rounds.

#### **Mathematical Formula**

```
For round r = 0 to 23:
  lane[0,0] ^= RC[r]
  
where RC[r] are precomputed round constants
```

#### **Analog Implementation: Current Addition with Mux**

```
Round Constant Addition:

┌─────────────────────────────────────────┐
│ Round r                                 │
│                                         │
│ Lookup: RC_current = LUT_RC[r]         │
│         (from 24-entry ROM)             │
│                                         │
│ Gate:   if (r >= 0 && r <= 23)        │
│           lane[0,0] += RC_current      │
│         else                           │
│           lane[0,0] unchanged          │
│                                         │
│ Hardware:                               │
│ - 24-entry ROM (precomputed constants) │
│ - Current adder (trivial - just add)   │
│ - Mux to select which lane gets RC     │
│                                         │
│ Power: ~1-2 mW (minimal)               │
│ Time: 1 cycle                          │
│                                         │
└─────────────────────────────────────────┘
```

---

## **4.4 Complete Keccak Round Pipeline**

### **One Full Round (All 5 Steps)**

```
┌─────────────────────────────────────────────────────────┐
│           One Keccak Round (Round r)                     │
│                                                          │
│  Input: 1600-bit state (25 lanes as currents)          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 1: Theta (Cross-lane mixing)                 │ │
│  │ Time: 10 cycles                                   │ │
│  │ Output: All lanes updated with XOR of neighbors   │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 2: Rho (Bit rotation)                        │ │
│  │ Time: 5 cycles (parallel for all lanes)           │ │
│  │ Output: Each lane rotated by fixed amount         │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 3: Pi (Lane permutation)                     │ │
│  │ Time: 2 cycles                                    │ │
│  │ Output: Lanes rearranged in 2D space             │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 4: Chi (Nonlinear mixing)                    │ │
│  │ Time: 6 cycles                                    │ │
│  │ Output: Nonlinear transformation applied         │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 5: Iota (Round constant)                     │ │
│  │ Time: 1 cycle                                     │ │
│  │ Output: Lane [0,0] XORed with round constant     │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│              Result: State after round r                  │
│                                                          │
│  Total per round: 10 + 5 + 2 + 6 + 1 = 24 cycles      │
│                  ≈ 240 ns @ 100 MHz                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **24 Rounds Complete**

```
24 rounds × 24 cycles/round = 576 cycles
                            ≈ 5.76 μs @ 100 MHz

But actually faster with pipelining:
- Can overlap Chi output with next round's Theta input
- Effectively: 24 + 23 = 47 cycle padding
- Real time: (24 + 23) × 100 ns = 4.7 μs (similar)
```

---

## **4.5 Full Keccak-256 Hash (End-to-End)**

### **Complete Flow**

```
┌──────────────────────────────────────────────────────────┐
│              Keccak-256 Hash Computation                  │
│                                                           │
│  Input: Message M (any length)                           │
│         For crypto: usually 256 bits                     │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 1: Padding                                   │ │
│  │                                                   │ │
│  │ If |M| ≤ 1088 bits (rate for Keccak-256):       │ │
│  │   Padded = M || 0x06 || 0...0 || 0x80           │ │
│  │   Length: pad to 1088 bits                      │ │
│  │                                                   │ │
│  │ For 256-bit message:                            │ │
│  │   - Add 0x06 (domain separator)                 │ │
│  │   - Add 0x80 (padding terminator)               │ │
│  │   - Fill with 0x00 to reach 1088 bits          │ │
│  │                                                   │ │
│  │ Time: ~1 μs (just data rearrangement)           │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 2: Initialize State                         │ │
│  │                                                   │ │
│  │ State = 1600 bits of zeros (25 lanes = 0)       │ │
│  │                                                   │ │
│  │ In analog: Set all I_lane[i] = 0 (ground)       │ │
│  │                                                   │ │
│  │ Time: ~1 μs (reset integrators)                 │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 3: Absorption (XOR input)                   │ │
│  │                                                   │ │
│  │ State ⊕= (Padded message || 0...0)              │ │
│  │                                                   │ │
│  │ For 1088-bit padded message:                    │ │
│  │   XOR first 17 lanes with message               │ │
│  │   lanes 17-24 stay 0 (capacity)                 │ │
│  │                                                   │ │
│  │ In analog:                                       │ │
│  │   for i = 0 to 16:                              │ │
│  │     I_lane[i] ⊕= I_msg[i]                      │ │
│  │                                                   │ │
│  │ Time: ~2 μs (17 XOR operations)                 │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 4: Apply 24 Rounds                          │ │
│  │                                                   │ │
│  │ For r = 0 to 23:                                │ │
│  │   State ←─ Keccak-f(State, r)                  │ │
│  │                                                   │ │
│  │ Each round: Theta→Rho→Pi→Chi→Iota              │ │
│  │                                                   │ │
│  │ Time: 24 rounds × 24 cycles = 576 cycles       │ │
│  │       ≈ 5.76 μs @ 100 MHz                      │ │
│  │                                                   │ │
│  │ Power during rounds: ~100-150 mW (XOR + AND)   │ │
│  │ (much of the power budget!)                      │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Step 5: Squeezing (Extract Output)              │ │
│  │                                                   │ │
│  │ Output = first 256 bits of state                │ │
│  │        = first 4 lanes (64 bits each)           │ │
│  │                                                   │
│  │ In analog:                                       │ │
│  │   for i = 0 to 3:                               │ │
│  │     Hash[i] ← I_lane[i] (readout)               │ │
│  │                                                   │ │
│  │ Time: ~1 μs (ADC conversion 4 lanes)            │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                                │
│                   Output: 256-bit hash                    │
│                                                           │
│  Total Time:                                             │
│    Padding: 1 μs                                         │
│  + Init: 1 μs                                            │
│  + Absorption: 2 μs                                      │
│  + 24 Rounds: 5.76 μs                                    │
│  + Squeezing: 1 μs                                       │
│  ═══════════════                                         │
│  Total: ~10.76 μs                                        │
│                                                           │
│  Compared to Digital:                                    │
│  - Digital hash: ~1-2 μs (faster, pipelined)            │
│  - Analog hash: ~11 μs (slower, sequential rounds)       │
│                                                           │
│  BUT: Analog's inherent noise helps with security!      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## **4.6 Power Breakdown for Keccak**

```
Component                  Power      Duty Cycle    Avg Power
────────────────────────────────────────────────────────────
Bandgap reference         1 mW       100% (on)     1 mW
Theta stage (XOR trees)   40 mW      43% (per rnd) 17 mW
Rho stage (muxes)         2 mW       43%           0.9 mW
Pi stage (muxes)          5 mW       43%           2.2 mW
Chi stage (AND-NOT)       50 mW      43%           21.5 mW
Iota stage                1 mW       43%           0.4 mW
State storage (caps)      2 mW       100%          2 mW
Output drivers            5 mW       43%           2.2 mW
────────────────────────────────────────────────────────────
Total during hash:        ~47 mW (averaged over full computation)
Idle power:               ~1 mW (just biasing)
```

---

# **5. True Random Number Generator (TRNG)**

The TRNG is **crucial** for ECDSA because we need k to be truly random. If k is predictable, the signature leaks the private key!

## **5.1 Entropy Source: Zener Diode Noise**

### **Physics Behind Zener Noise**

When a Zener diode is reverse-biased above breakdown voltage:

```
Normal diode operation:
  V_f ≈ 0.7V (forward drop)
  I = I_s × (e^(V_f / V_t) - 1)

Reverse-biased (Zener):
  V_z ≈ 5V (fixed breakdown voltage)
  Noise sources:
    1. Shot noise: thermal fluctuations in electron flow
    2. Avalanche noise: random impact ionization
    3. 1/f noise: device imperfections
```

### **Noise Characteristics**

```
Zener diode noise spectrum:

Power Spectral Density:
   S_n(f)
    ↑
    │        ┌─────────── White noise (~f^0)
    │       / (Shot + Avalanche)
    │      /
    │     /  ┌─ 1/f noise region
    │    /  /
    │   /  /
    │  /  /
    │/__/____────────────────→ f (Hz)
    │  1   10   100   1k    10k  100k  1M    10M

Typical Zener noise:
- Magnitude: 10-100 nV/√Hz (shot noise white region)
- 1/f corner: ~100 Hz to 1 kHz
- Whiteness: Good above 10 kHz
```

---

## **5.2 TRNG Circuit Architecture**

### **Complete TRNG Block Diagram**

```
┌───────────────────────────────────────────────────────────┐
│                  Analog TRNG System                        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Stage 1: Entropy Generation (Zener)               │ │
│  │                                                     │ │
│  │         VDD                                        │ │
│  │          │                                         │ │
│  │       ┌──┴──┐                                     │ │
│  │       │ Z1  │ (Zener diode, V_z = 5-6V)         │ │
│  │       └──┬──┘                                     │ │
│  │          │                                        │ │
│  │       ┌──┴───────────┐                           │ │
│  │       │  100 Ω       │ (series resistor)         │ │
│  │       │  (limit I)   │                           │ │
│  │       └──┬───────────┘                           │ │
│  │          │                                        │ │
│  │          ├───────────── V_noise (5-6V + noise)   │ │
│  │          │                                        │ │
│  │       ┌──┴───────────┐                           │ │
│  │       │  R_pull = 10k│ (pull-down)               │ │
│  │       │              │                           │ │
│  │       └──┬───────────┘                           │ │
│  │          │                                        │ │
│  │         GND                                       │ │
│  │                                                     │ │
│  │ Output: V_noise ≈ 3V ± 100 mV (noisy!)          │ │
│  │ Noise power: ~1 μW (dissipated in Zener)        │ │
│  │                                                     │ │
│  └──────────────────────────────────────────────────┘ │
│                          │                             │
│  ┌──────────────────────V──────────────────────────┐  │
│  │ Stage 2: Amplification & Filtering              │  │
│  │                                                  │  │
│  │       V_noise                                   │  │
│  │          │                                      │  │
│  │          V                                      │  │
│  │         ┌───┐                                  │  │
│  │         │M_1│ (input transistor, gain stage)  │  │
│  │         └─┬─┘                                  │  │
│  │           │                                    │  │
│  │        ┌──┴──┐                                │  │
│  │        │ Op- │ (1000× voltage gain)           │  │
│  │        │ Amp │                                │  │
│  │        └──┬──┘                                │  │
│  │           │                                    │  │
│  │      ┌────┴────┐                              │  │
│  │      │ C_filter│ (1 nF low-pass)             │  │
│  │      │ f_c=10kHz                             │  │
│  │      └────┬────┘                              │  │
│  │           │                                    │  │
│  │        V_amp ≈ ±100V DC + 10-100 mV noise    │  │
│  │ (actually limited to supply rails)            │  │
│  │                                                  │  │
│  │ Practical: V_amp ≈ 2-4.5V with noise (100mV)│  │
│  │                                                  │  │
│  └──────────────────────────────────────────────┘  │
│                          │                           │
│  ┌──────────────────────V──────────────────────┐   │
│  │ Stage 3: Comparator (1-bit extraction)      │   │
│  │                                               │   │
│  │       V_amp (≈ 2.5V ± 0.05V)                │   │
│  │          │\                                  │   │
│  │          │ >─────────┐                      │   │
│  │   1.5V ──│/          │                      │   │
│  │   (ref)  │           V                      │   │
│  │          │        Comparator                │   │
│  │          │        (latch-type)              │   │
│  │          │           │                      │   │
│  │          │        V_bit (0 or VDD)         │   │
│  │          │           │                      │   │
│  │          │        Schmitt trigger           │   │
│  │          │        (hysteresis 200mV)       │   │
│  │          │           │                      │   │
│  │          │        V_digital (0 or 1)       │   │
│  │                                               │   │
│  │ Output bit probability:                     │   │
│  │   P(0) = P(V_amp < V_ref) ≈ 0.5            │   │
│  │   P(1) = P(V_amp > V_ref) ≈ 0.5            │   │
│  │                                               │   │
│  │ (noise ensures ~50/50 distribution)        │   │
│  │                                               │   │
│  └──────────────────────────────────────────┘   │
│                          │                       │
│  ┌──────────────────────V──────────────────┐   │
│  │ Stage 4: Post-Processing (Von Neumann) │   │
│  │                                           │   │
│  │ Input bits (correlated): B1, B2, B3...  │   │
│  │                                           │   │
│  │ Algorithm:                                │   │
│  │   for each pair (B_i, B_{i+1}):        │   │
│  │     if B_i ≠ B_{i+1}:                  │   │
│  │       output B_i                       │   │
│  │     else:                              │   │
│  │       discard pair                     │   │
│  │                                           │   │
│  │ Effect: De-correlates bits              │   │
│  │ Output rate: ~50% of input              │   │
│  │                                           │   │
│  └──────────────────────────────────────────┘   │
│                          │                       │
│  ┌──────────────────────V───────────────────┐  │
│  │ Stage 5: Output FIFO (Buffering)         │  │
│  │                                            │  │
│  │ Random bits (buffered at 256 bits)       │  │
│  │ Ready to be consumed by ECDSA            │  │
│  │                                            │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## **5.3 Entropy Quality Metrics**

### **NIST Statistical Tests**

The TRNG output must pass NIST SP 800-22 randomness tests:

```
Test                          Pass Criterion
────────────────────────────────────────────
Monobit Test                  P-value > 0.01
Block Frequency               P-value > 0.01
Cumulative Sums               P-value > 0.01
Runs Test                     P-value > 0.01
Longest Runs                  P-value > 0.01
Rank Test                     P-value > 0.01
Spectral Test (FFT)           P-value > 0.01
Non-overlapping Template      P-value > 0.01
Overlapping Template          P-value > 0.01
Approximate Entropy           P-value > 0.01
Serial Test                   P-value > 0.01
Entropy Test                  H > 0.99 bits/bit
Min-Entropy                   H_min > 0.95 bits/bit
```

### **Expected Performance**

```
Zener Diode TRNG (typical):
  Output rate: 1-10 kbit/s (after post-processing)
  Entropy per bit: >0.99 bits
  Minimum entropy: >0.97 bits (good!)
  
For ECDSA signature (need 256-bit k):
  Time to generate 256 bits: 26-256 ms
  (acceptable for crypto operations)
  
Improvement with multiple Zeners:
  - Use 4-8 Zeners in parallel
  - Output rate: 4-80 kbit/s
  - 256 bits: 3-64 ms
```

---

## **5.4 TRNG in Hybrid System**

For the hybrid Phase 3 chip, TRNG supplies the digital control:

```
Hybrid TRNG Usage:

┌─────────────────────────────────────────────┐
│  Analog TRNG                                │
│  (Zener noise source)                       │
│  Output: Continuous analog noise (10 μV)   │
│                                              │
└────────────────┬────────────────────────────┘
                 │
         ┌───────V────────┐
         │  A/D Converter │ (8-bit, ~1 MHz)
         │  (Delta-Sigma) │
         └───────┬────────┘
                 │
        Digital bit stream (1 Mbit/s)
                 │
         ┌───────V────────┐
         │ Von Neumann    │ (software)
         │ Corrector      │
         └───────┬────────┘
                 │
        Final random bits (500 kbit/s)
                 │
         ┌───────V────────────┐
         │ FIFO Buffer (256b) │
         │ (for ECDSA k)      │
         └───────┬────────────┘
                 │
    Used by digital ECDSA for nonce k
```

---

# **6. Physical Unclonable Function (PUF)**

PUF is used for chip identification and authentication (optional, but good for security).

## **6.1 Ring Oscillator Array PUF**

### **Principle**

Each ring oscillator has a slightly different frequency due to device mismatch:

```
Ring Oscillator:

    ┌─────┐    ┌─────┐    ┌─────┐
    │ NOT │    │ NOT │    │ NOT │
┌───┤     ├────┤     ├────┤     ├───┐
│   └─────┘    └─────┘    └─────┘   │
│                                     │
└─────────────────────────────────────┘
(inverter chain with odd number of stages)

Oscillation frequency: f = 1 / (2 × n × t_delay)

where:
  n = number of inverters (typically 5-7)
  t_delay = propagation delay per inverter
  
Due to process variation: each RO has unique f
```

### **PUF Circuit Design**

```
┌────────────────────────────────────────────────────┐
│            Ring Oscillator PUF Array                │
│                                                     │
│  ┌──────────────┐        ┌──────────────┐         │
│  │ Ring Osc 0   │        │ Ring Osc 1   │  ...    │
│  │ (f0 ≈ 1.2GHz)├──┐  ┌──┤ (f1 ≈ 1.25GHz)        │
│  └──────────────┘  │  │  └──────────────┘         │
│                    │  │                             │
│  ┌──────────────┐  │  │  ┌──────────────┐         │
│  │ Ring Osc 2   │  │  │  │ Ring Osc 3   │  ...   │
│  │ (f2 ≈ 1.18GHz)├──┼──┼──┤ (f3 ≈ 1.3GHz)        │
│  └──────────────┘  │  │  └──────────────┘         │
│                    │  │                             │
│  ... (up to N ROs) │  │                             │
│                    ▼  ▼                             │
│              ┌─────────────┐                       │
│              │ Counter Mux │                       │
│              │ (select 2   │                       │
│              │  ROs at a   │                       │
│              │  time)      │                       │
│              └──────┬──────┘                       │
│                     │                              │
│         ┌───────────┼───────────┐                  │
│         │           │           │                  │
│     Counter0    Counter1   Comparator             │
│    (counts         (counts    (determines        │
│     RO_i          RO_j       which is faster)    │
│     for 1ms)      for 1ms)                        │
│         │           │           │                  │
│         └───────────┴───────────┴───┐             │
│                                      │             │
│                                   Bit output       │
│                                   (0 or 1)        │
│                                                    │
│  Challenge-Response:                             │
│    Challenge = (i, j) = which pair to compare    │
│    Response = 1 if f_i > f_j, else 0            │
│                                                    │
└────────────────────────────────────────────────────┘

Example:
  Challenge = (0, 1)
  Counter0 after 1ms: 1,200,000 counts
  Counter1 after 1ms: 1,250,000 counts
  → f1 > f0
  → Response = 1
```

### **PUF Specifications**

```
Typical Ring Oscillator PUF:
  Number of ROs: 32-64 (on crypto chip)
  Frequency range: 0.8-1.5 GHz
  Challenge space: C(N, 2) = N×(N-1)/2 pairs
  For N=64: ~2048 challenge-response pairs
  Response entropy: 1 bit per pair
  Total entropy: ~2048 bits (chip fingerprint!)
  
Time to generate one response: 1-10 ms
(depending on counter resolution)
```

---

## **6.2 PUF in Hybrid System**

```
Hybrid PUF Usage:

┌──────────────────────────┐
│  Analog Ring Oscillators │
│  (N = 16 ROs on chip)    │
│  Frequency range: 100MHz │
│  - RO 0: f0 ≈ 105 MHz    │
│  - RO 1: f1 ≈ 103 MHz    │
│  - ...                    │
└──────────┬───────────────┘
           │
    ┌──────V────────┐
    │ Digital Logic │ (counter + mux)
    │ Compares      │
    │ RO pairs      │
    └──────┬────────┘
           │
    Chip-unique fingerprint
    (used for authentication)
```

---

This is getting quite long! Should I continue with:

1. **AXI4-Lite Analog Interface** (current-mode signaling)
2. **Power Management & Biasing** (bandgap, current sources)
3. **Layout & Manufacturing** (floorplan, process tech)
4. **Testing & Characterization** (simulations, yield)

Or focus deeper on any of these? 🎯⚡

