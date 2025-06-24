# Verilog Testbench Suite

This directory contains testbenches for all major Verilog modules in the Virtual Chip Signature System.

## Running All Tests

To run all testbenches (including unit, integration, and scenario tests):

```bash
bash ../../6.\ Tools/Simulation/run_simulation.sh
```

## Adding New Test Scenarios
- Add your testbench as a `.v` file in this directory.
- Update the `run_comprehensive_test` function in `../../6. Tools/Simulation/run_simulation.sh` to include your new testbench.
- Optionally, add scenario logic to the script for custom runs.

## Test Results
- Logs: `../../6. Tools/Simulation/logs/`
- Results (JSON): `../../6. Tools/Simulation/results/`
- Waveforms: `../../6. Tools/Simulation/waveforms/`

## CI/CD Integration
- All tests are run automatically on every push/PR via GitHub Actions.
- See `.github/workflows/verilog-ci.yml` for details.

## Troubleshooting
- Ensure you have `iverilog` and `gtkwave` installed.
- Check logs for compilation or simulation errors. 