# Simulation Tools

This directory contains scripts and utilities for running Verilog simulations for the Virtual Chip Signature System.

## Main Script: `run_simulation.sh`
- Runs all major testbenches and scenarios.
- Supports comprehensive, scenario-based, and custom test runs.
- Generates logs, results (JSON), and waveforms.

## Usage
Run all tests:
```bash
bash run_simulation.sh
```
Run a specific scenario:
```bash
bash run_simulation.sh scenario basic
```
Clean generated files:
```bash
bash run_simulation.sh clean
```

## Adding New Scenarios
- Add your scenario logic to the `generate_scenario_test` function in `run_simulation.sh`.
- Add your testbench to the `test_files` array in `run_comprehensive_test` if needed.

## CI/CD
- This script is used by the GitHub Actions workflow for automated testing.

## Troubleshooting
- Ensure `iverilog` and `gtkwave` are installed.
- Check the `logs/` and `results/` directories for details on failures. 