#!/bin/bash
# clean.sh - Clean build artifacts and temporary files
# Removes all generated files from compilation and simulation
# Author: Virtual Chip Signature System

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Virtual Chip Signature System - Cleanup ===${NC}"

# Directories to clean
DIRS_TO_CLEAN=(
    "build"
    "simulation"
    "logs"
    "waves"
    "output_files"
    "reports"
    "tmp"
)

# Files to clean
FILES_TO_CLEAN=(
    "*.vcd"
    "*.lxt2"
    "*.fst"
    "*.o"
    "*.so"
    "*.a"
    "*.exe"
    "sim"
    "dump.vcd"
    "waveform.vcd"
    "*.log"
    "*.tmp"
    "*.bak"
    "*~"
    ".DS_Store"
    "Thumbs.db"
)

# Vivado specific files
VIVADO_FILES=(
    "*.jou"
    "*.log"
    "*.str"
    "*.xpr"
    "*.xdc"
    "*.tcl"
    "*.runs"
    "*.cache"
    "*.hw"
    "*.ip_user_files"
    "*.sim"
    "*.data"
    "*.xpe"
    "*.xpi"
    "*.xsa"
    "*.bit"
    "*.bin"
    "*.mcs"
    "*.prm"
)

# Quartus specific files
QUARTUS_FILES=(
    "*.qpf"
    "*.qsf"
    "*.qdf"
    "*.qws"
    "*.qar"
    "*.sof"
    "*.pof"
    "*.rbf"
    "*.jam"
    "*.jbc"
    "*.sopcinfo"
    "*.qsys"
    "*.sdc"
    "*.srf"
    "*.summary"
    "*.rpt"
    "*.pin"
    "*.smsg"
    "*.cmp"
    "*.map"
    "*.fit"
    "*.asm"
    "*.sta"
    "*.eda"
    "*.sld"
    "*.sdo"
    "*.sopc"
    "*.spd"
    "*.spx"
    "*.spy"
    "*.spz"
    "*.spa"
    "*.spb"
    "*.spc"
    "*.spd"
    "*.spe"
    "*.spf"
    "*.spg"
    "*.sph"
    "*.spi"
    "*.spj"
    "*.spk"
    "*.spl"
    "*.spm"
    "*.spn"
    "*.spo"
    "*.spp"
    "*.spq"
    "*.spr"
    "*.sps"
    "*.spt"
    "*.spu"
    "*.spv"
    "*.spw"
    "*.spx"
    "*.spy"
    "*.spz"
)

# Function to clean directories
clean_directories() {
    echo -e "${YELLOW}Cleaning directories...${NC}"
    for dir in "${DIRS_TO_CLEAN[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "${YELLOW}  Removing directory: $dir${NC}"
            rm -rf "$dir"
            echo -e "${GREEN}    ✓ $dir${NC}"
        else
            echo -e "${BLUE}    - $dir (not found)${NC}"
        fi
    done
}

# Function to clean files
clean_files() {
    echo -e "${YELLOW}Cleaning files...${NC}"
    for pattern in "${FILES_TO_CLEAN[@]}"; do
        files=$(find . -name "$pattern" -type f 2>/dev/null || true)
        if [ -n "$files" ]; then
            echo -e "${YELLOW}  Removing files matching: $pattern${NC}"
            find . -name "$pattern" -type f -delete 2>/dev/null || true
            echo -e "${GREEN}    ✓ $pattern${NC}"
        else
            echo -e "${BLUE}    - $pattern (not found)${NC}"
        fi
    done
}

# Function to clean Vivado files
clean_vivado() {
    echo -e "${YELLOW}Cleaning Vivado files...${NC}"
    for pattern in "${VIVADO_FILES[@]}"; do
        files=$(find . -name "$pattern" -type f 2>/dev/null || true)
        if [ -n "$files" ]; then
            echo -e "${YELLOW}  Removing Vivado files matching: $pattern${NC}"
            find . -name "$pattern" -type f -delete 2>/dev/null || true
            echo -e "${GREEN}    ✓ $pattern${NC}"
        fi
    done
}

# Function to clean Quartus files
clean_quartus() {
    echo -e "${YELLOW}Cleaning Quartus files...${NC}"
    for pattern in "${QUARTUS_FILES[@]}"; do
        files=$(find . -name "$pattern" -type f 2>/dev/null || true)
        if [ -n "$files" ]; then
            echo -e "${YELLOW}  Removing Quartus files matching: $pattern${NC}"
            find . -name "$pattern" -type f -delete 2>/dev/null || true
            echo -e "${GREEN}    ✓ $pattern${NC}"
        fi
    done
}

# Function to clean empty directories
clean_empty_dirs() {
    echo -e "${YELLOW}Removing empty directories...${NC}"
    find . -type d -empty -delete 2>/dev/null || true
    echo -e "${GREEN}  ✓ Empty directories removed${NC}"
}

# Function to show disk usage before and after
show_disk_usage() {
    if command -v du &> /dev/null; then
        echo -e "${BLUE}Disk usage before cleanup:${NC}"
        du -sh . 2>/dev/null || echo "Unable to determine disk usage"
    fi
}

# Function to show disk usage after cleanup
show_disk_usage_after() {
    if command -v du &> /dev/null; then
        echo -e "${BLUE}Disk usage after cleanup:${NC}"
        du -sh . 2>/dev/null || echo "Unable to determine disk usage"
    fi
}

# Main cleanup function
main() {
    local clean_type=${1:-"all"}
    
    case $clean_type in
        "all")
            echo -e "${BLUE}Performing full cleanup...${NC}"
            show_disk_usage
            clean_directories
            clean_files
            clean_vivado
            clean_quartus
            clean_empty_dirs
            show_disk_usage_after
            ;;
        "build")
            echo -e "${BLUE}Cleaning build artifacts only...${NC}"
            clean_directories
            clean_files
            ;;
        "simulation")
            echo -e "${BLUE}Cleaning simulation files only...${NC}"
            rm -rf simulation/ logs/ waves/ *.vcd *.lxt2 *.fst sim dump.vcd waveform.vcd
            ;;
        "vivado")
            echo -e "${BLUE}Cleaning Vivado files only...${NC}"
            clean_vivado
            ;;
        "quartus")
            echo -e "${BLUE}Cleaning Quartus files only...${NC}"
            clean_quartus
            ;;
        *)
            echo -e "${RED}Error: Unknown cleanup type '$clean_type'${NC}"
            echo "Usage: $0 [all|build|simulation|vivado|quartus]"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}=== Cleanup Complete ===${NC}"
}

# Run main function
main "$@" 