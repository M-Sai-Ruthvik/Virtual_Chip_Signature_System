// scripts/verify_tx.js
// Verifies a signature using the deployed SignatureVerifier contract

const hre = require("hardhat");
const readline = require("readline");

async function prompt(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  // Get contract address from user
  const contractAddress = await prompt("Enter SignatureVerifier contract address: ");
  const signer = await prompt("Enter signer address: ");
  const message = await prompt("Enter original message: ");
  const signature = await prompt("Enter signature (0x...): ");

  // Get contract instance
  const contract = await hre.ethers.getContractAt("SignatureVerifier", contractAddress);

  // Call verifySignature
  try {
    const result = await contract.verifySignature(signer, message, signature);
    console.log("Verification result:", result ? "VALID" : "INVALID");
  } catch (err) {
    console.error("Verification failed:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
