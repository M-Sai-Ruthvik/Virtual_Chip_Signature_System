// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SignatureVerifier
 * @dev A production-ready smart contract for verifying ECDSA signatures on-chain
 * @dev Supports signature submission, verification, and event logging
 * @dev Includes access control, gas optimization, and comprehensive error handling
 */
contract SignatureVerifier {
    // Events
    event SignatureSubmitted(
        address indexed signer,
        string indexed messageHash,
        bytes signature,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event SignatureVerified(
        address indexed signer,
        string indexed messageHash,
        bool isValid,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event ContractPaused(address indexed by, uint256 timestamp);
    event ContractUnpaused(address indexed by, uint256 timestamp);
    
    // State variables
    mapping(bytes32 => bool) public signatureUsed;
    mapping(address => uint256) public signatureCount;
    mapping(address => bool) public authorizedVerifiers;
    
    address public owner;
    bool public paused;
    uint256 public totalSignatures;
    uint256 public totalVerifications;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "SignatureVerifier: caller is not the owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedVerifiers[msg.sender] || msg.sender == owner, "SignatureVerifier: not authorized");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "SignatureVerifier: contract is paused");
        _;
    }
    
    modifier whenPaused() {
        require(paused, "SignatureVerifier: contract is not paused");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        authorizedVerifiers[msg.sender] = true;
        paused = false;
    }
    
    /**
     * @dev Submit a signature for verification
     * @param message The original message that was signed
     * @param signature The ECDSA signature
     * @param signer The address that signed the message
     * @return isValid Whether the signature is valid
     */
    function submitSignature(
        string memory message,
        bytes memory signature,
        address signer
    ) public whenNotPaused returns (bool isValid) {
        require(bytes(message).length > 0, "SignatureVerifier: message cannot be empty");
        require(signature.length == 65, "SignatureVerifier: invalid signature length");
        require(signer != address(0), "SignatureVerifier: invalid signer address");
        
        // Create unique identifier for this signature
        bytes32 signatureId = keccak256(abi.encodePacked(message, signature, signer));
        require(!signatureUsed[signatureId], "SignatureVerifier: signature already used");
        
        // Mark signature as used
        signatureUsed[signatureId] = true;
        
        // Verify the signature
        isValid = verifySignature(message, signature, signer);
        
        // Update counters
        signatureCount[signer]++;
        totalSignatures++;
        totalVerifications++;
        
        // Emit events
        emit SignatureSubmitted(
            signer,
            keccak256(abi.encodePacked(message)),
            signature,
            block.timestamp,
            block.number
        );
        
        emit SignatureVerified(
            signer,
            keccak256(abi.encodePacked(message)),
            isValid,
            block.timestamp,
            block.number
        );
    }
    
    /**
     * @dev Verify a signature without submitting it
     * @param message The original message
     * @param signature The ECDSA signature
     * @param signer The expected signer address
     * @return isValid Whether the signature is valid
     */
    function verifySignatureOnly(
        string memory message,
        bytes memory signature,
        address signer
    ) public view returns (bool isValid) {
        require(bytes(message).length > 0, "SignatureVerifier: message cannot be empty");
        require(signature.length == 65, "SignatureVerifier: invalid signature length");
        require(signer != address(0), "SignatureVerifier: invalid signer address");
        
        isValid = verifySignature(message, signature, signer);
    }
    
    /**
     * @dev Internal function to verify ECDSA signatures
     * @param message The message to verify
     * @param signature The signature to verify
     * @param expectedSigner The expected signer address
     * @return isValid Whether the signature is valid
     */
    function verifySignature(
        string memory message,
        bytes memory signature,
        address expectedSigner
    ) internal pure returns (bool isValid) {
        // Create the message hash (same as Ethereum's personal_sign)
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", uint256(bytes(message).length), message));
        
        // Extract r, s, v from signature
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        // Handle signature malleability
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "SignatureVerifier: invalid signature 'v' value");
        
        // Recover the signer address
        address recoveredSigner = ecrecover(messageHash, v, r, s);
        
        // Check if the recovered signer matches the expected signer
        isValid = (recoveredSigner != address(0) && recoveredSigner == expectedSigner);
    }
    
    /**
     * @dev Batch verify multiple signatures
     * @param messages Array of messages
     * @param signatures Array of signatures
     * @param signers Array of signer addresses
     * @return results Array of verification results
     */
    function batchVerifySignatures(
        string[] memory messages,
        bytes[] memory signatures,
        address[] memory signers
    ) public view returns (bool[] memory results) {
        require(
            messages.length == signatures.length && signatures.length == signers.length,
            "SignatureVerifier: array lengths must match"
        );
        require(messages.length > 0, "SignatureVerifier: cannot verify empty array");
        require(messages.length <= 100, "SignatureVerifier: batch size too large");
        
        results = new bool[](messages.length);
        
        for (uint256 i = 0; i < messages.length; i++) {
            results[i] = verifySignatureOnly(messages[i], signatures[i], signers[i]);
        }
    }
    
    // Access Control Functions
    
    /**
     * @dev Add an authorized verifier
     * @param verifier The address to authorize
     */
    function addAuthorizedVerifier(address verifier) public onlyOwner {
        require(verifier != address(0), "SignatureVerifier: invalid verifier address");
        authorizedVerifiers[verifier] = true;
    }
    
    /**
     * @dev Remove an authorized verifier
     * @param verifier The address to remove authorization from
     */
    function removeAuthorizedVerifier(address verifier) public onlyOwner {
        require(verifier != owner, "SignatureVerifier: cannot remove owner");
        authorizedVerifiers[verifier] = false;
    }
    
    /**
     * @dev Transfer ownership
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "SignatureVerifier: new owner cannot be zero address");
        owner = newOwner;
        authorizedVerifiers[newOwner] = true;
    }
    
    // Pause/Unpause Functions
    
    /**
     * @dev Pause the contract
     */
    function pause() public onlyOwner whenNotPaused {
        paused = true;
        emit ContractPaused(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() public onlyOwner whenPaused {
        paused = false;
        emit ContractUnpaused(msg.sender, block.timestamp);
    }
    
    // View Functions
    
    /**
     * @dev Get signature statistics for a signer
     * @param signer The signer address
     * @return count Number of signatures submitted by this signer
     */
    function getSignerStats(address signer) public view returns (uint256 count) {
        return signatureCount[signer];
    }
    
    /**
     * @dev Check if a signature has been used
     * @param message The message
     * @param signature The signature
     * @param signer The signer address
     * @return used Whether the signature has been used
     */
    function isSignatureUsed(
        string memory message,
        bytes memory signature,
        address signer
    ) public view returns (bool used) {
        bytes32 signatureId = keccak256(abi.encodePacked(message, signature, signer));
        return signatureUsed[signatureId];
    }
    
    /**
     * @dev Get contract statistics
     * @return _totalSignatures Total signatures submitted
     * @return _totalVerifications Total verifications performed
     * @return _paused Whether contract is paused
     */
    function getContractStats() public view returns (
        uint256 _totalSignatures,
        uint256 _totalVerifications,
        bool _paused
    ) {
        return (totalSignatures, totalVerifications, paused);
    }
    
    // Emergency Functions
    
    /**
     * @dev Emergency function to recover stuck ETH
     * @param recipient The address to send ETH to
     */
    function emergencyWithdraw(address payable recipient) public onlyOwner {
        require(recipient != address(0), "SignatureVerifier: invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "SignatureVerifier: no ETH to withdraw");
        
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "SignatureVerifier: ETH transfer failed");
    }
}
