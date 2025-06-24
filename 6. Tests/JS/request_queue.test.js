const { expect } = require('chai');
const RequestQueue = require('../../6. Tools/Queue_Manager/requestQueue');

describe('RequestQueue', function() {
    let queue;
    beforeEach(() => {
        queue = new RequestQueue({ maxConcurrent: 2, retryAttempts: 2, retryDelay: 10 });
    });

    it('should add a request and process it', async function() {
        const handler = async (data) => data + 1;
        const result = await queue.addRequest({ handler, data: 1 });
        expect(result).to.equal(2);
    });

    it('should retry failed requests', async function() {
        let attempts = 0;
        const handler = async () => { attempts++; throw new Error('fail'); };
        try {
            await queue.addRequest({ handler });
        } catch (e) {
            expect(attempts).to.be.above(1);
        }
    });
}); 