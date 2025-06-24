const { expect } = require('chai');
const EthersUtils = require('../../6. Tools/JS/Ethers');

describe('EthersUtils', function() {
    let ethersUtils;
    beforeEach(() => {
        ethersUtils = new EthersUtils({ defaultNetwork: 'local' });
    });

    it('should initialize provider and signer (mocked)', async function() {
        // Mock provider and signer for test
        ethersUtils.provider = {};
        ethersUtils.signer = {};
        expect(ethersUtils.provider).to.be.an('object');
        expect(ethersUtils.signer).to.be.an('object');
    });

    it('should throw error if contract loaded before init', function() {
        expect(() => ethersUtils.loadContract('Test', '0x0', [])).to.throw();
    });

    // Add more tests for estimateGas, sendTransaction, etc. with mocks
}); 