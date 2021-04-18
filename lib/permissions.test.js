const permissions = require('./permissions');

let midObjects = {};
describe('Test permissions middleware', () => {
    beforeEach(() => {
        midObjects = {
            next: jest.fn(),
            req: {},
            res: {},
        };
    });

    describe('Call with no permissions', () => {
        test('Should show empty list', () => {
            const middleware = permissions();
            middleware(midObjects.req, midObjects.res, midObjects.next);

            expect(midObjects.req.permissions).toEqual([]);
            expect(midObjects.next).toHaveBeenCalledTimes(1);
        });
    });

    describe('Call with permissions list', () => {
        test('Should show list items', () => {
            const permissionsList = ['user.read', 'user.write'];
            const middleware = permissions(...permissionsList);
            middleware(midObjects.req, midObjects.res, midObjects.next);

            expect(midObjects.req.permissions).toEqual(permissionsList);
            expect(midObjects.next).toHaveBeenCalledTimes(1);
        });
    });
});
