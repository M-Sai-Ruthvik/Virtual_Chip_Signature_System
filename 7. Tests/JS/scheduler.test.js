const { expect } = require('chai');
const TaskScheduler = require('../../6. Tools/Queue_Manager/scheduler');

describe('TaskScheduler', function() {
    let scheduler;
    beforeEach(() => {
        scheduler = new TaskScheduler({ maxWorkers: 2 });
    });

    it('should add a task and complete it', async function() {
        const handler = async (data) => data * 2;
        const result = await scheduler.addTask({ handler, data: 3 });
        expect(result).to.equal(6);
    });

    it('should assign tasks to workers', function() {
        expect(scheduler.workers.size).to.equal(2);
    });
}); 