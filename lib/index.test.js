jest.mock('node-fetch');
const fetch = require('node-fetch');
const {Response} = jest.requireActual('node-fetch');

const opaExpress = require('.');

describe('Validating authz request', () => {
    beforeEach(() => {
        const allowResponse = {
            result: {
                allow: true,
            },
        };
        const allowBody = JSON.stringify(allowResponse);
        fetch.mockReturnValue(Promise.resolve(new Response(allowBody)));
    });

    test('Use authorization server', async () => {
        const authzServer = 'http://authz.server';
        const middleware = opaExpress(() => ({
            authzServer: authzServer,
        }));

        const next = jest.fn();
        await middleware({}, {}, next);

        expect(fetch).toHaveBeenCalledTimes(1);
        const fetchCall = fetch.mock.calls[0];
        expect(authzServer).toEqual(fetchCall[0]);
    });

    test('Should include request body', async () => {
        const middleware = opaExpress(() => ({
            includeBody: true,
        }));

        const next = jest.fn();
        const req = {
            body: {
                someValues: 123,
                otherValues: 'abc',
            },
        };

        await middleware(req, {}, next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(req.body).toEqual(fetchBody.input.request.body);
    });

    test('Should not include request body', async () => {
        const middleware = opaExpress(() => ({
            includeBody: false,
        }));

        const next = jest.fn();
        const req = {
            body: {
                someValues: 123,
                otherValues: 'abc',
            },
        };

        await middleware(req, {}, next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(undefined).toEqual(fetchBody.input.request.body);
    });

    test('Should include request headers', async () => {
        const middleware = opaExpress(() => ({
            includeHeaders: true,
        }));

        const next = jest.fn();
        const req = {
            headers: {
                'some-header': 123,
                'other-header': 'abc',
            },
        };

        await middleware(req, {}, next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(req.headers).toEqual(fetchBody.input.request.headers);
    });

    test('Should not include request headers', async () => {
        const middleware = opaExpress(() => ({
            includeHeaders: false,
        }));

        const next = jest.fn();
        const req = {
            headers: {
                'some-header': 123,
                'other-header': 'abc',
            },
        };

        await middleware(req, {}, next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(undefined).toEqual(fetchBody.input.request.headers);
    });

    test('Should add enrich values', async () => {
        const middleware = opaExpress(() => ({
            enrich: {
                data: 123,
            },
        }));

        const next = jest.fn();

        await middleware({}, {}, next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(123).toEqual(fetchBody.input.request.data);
    });
});

describe('Validating next call', () => {
    let midObjects = {};

    beforeEach(() => {
        const res = {};
        res.status = jest.fn(() => res);
        res.send = jest.fn(() => res);

        midObjects = {
            next: jest.fn(),
            req: {},
            res: res,
        };
    });

    test('Filter request should call next middleware', async () => {
        const middleware = opaExpress(() => ({
            filter: false,
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectSuccess();
    });

    test('Allowed response should call next middleware', async () => {
        const allowResponse = {
            result: {
                allow: true,
            },
        };
        const allowBody = JSON.stringify(allowResponse);
        fetch.mockReturnValue(Promise.resolve(new Response(allowBody)));

        const middleware = opaExpress(() => ({}));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectSuccess();
    });

    test('Denied response should not call next middleware', async () => {
        const denyResponse = {
            result: {
                allow: false,
            },
        };
        const denyBody = JSON.stringify(denyResponse);
        fetch.mockReturnValue(Promise.resolve(new Response(denyBody)));

        const middleware = opaExpress(() => ({}));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectFailure();
    });

    test('Allow on fail should call next middleware', async () => {
        fetch.mockReturnValue(Promise.reject(new Error()));

        const middleware = opaExpress(() => ({
            allowOnFail: true,
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectSuccess();
    });

    test('Deny on fail should not call next middleware', async () => {
        fetch.mockReturnValue(Promise.reject(new Error()));

        const middleware = opaExpress(() => ({
            allowOnFail: false,
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectFailure();
    });

    /**
     * Verify the next callback have been called once
     */
    function expectSuccess() {
        expect(midObjects.next).toHaveBeenCalledTimes(1);
    }

    /**
     * Verify the next callback haven't been called
     * And the response status returned is 403
     */
    function expectFailure() {
        expect(midObjects.next).toHaveBeenCalledTimes(0);
        expect(midObjects.res.status).toHaveBeenCalledTimes(1);
        expect(midObjects.res.status).toHaveBeenCalledWith(403);
    }
});
