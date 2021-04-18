jest.mock('node-fetch');
const fetch = require('node-fetch');
const {Response} = jest.requireActual('node-fetch');

const opaExpress = require('./authorize');

let midObjects = {};
let endpointOpts = {};

beforeEach(() => {
    const res = {};
    res.status = jest.fn(() => res);
    res.send = jest.fn(() => res);

    midObjects = {
        next: jest.fn(),
        req: {
            connection: {},
        },
        res: res,
    };

    endpointOpts = {
        hostname: 'http://localhost',
        port: 8181,
        policyPath: 'some/path',
    };
});

describe('Validating authz request', () => {
    beforeEach(() => {
        const allowResponse = {
            result: true,
        };
        const allowBody = JSON.stringify(allowResponse);
        fetch.mockReturnValue(Promise.resolve(new Response(allowBody)));
    });

    test('Use authorization server', async () => {
        const endpoint = 'https://authz.server:8181/v1/data/policy/path';
        const middleware = opaExpress(() => ({
            hostname: 'https://authz.server',
            port: 8181,
            policyPath: '/policy/path',
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);

        expect(fetch).toHaveBeenCalledTimes(1);
        const fetchCall = fetch.mock.calls[0];
        expect(endpoint).toEqual(fetchCall[0]);
    });

    test('Use authorization server without scheme', async () => {
        const endpoint = 'http://authz.server:8181/v1/data/policy/path';
        const middleware = opaExpress(() => ({
            hostname: 'authz.server',
            port: 8181,
            policyPath: '/policy/path',
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);

        expect(fetch).toHaveBeenCalledTimes(1);
        const fetchCall = fetch.mock.calls[0];
        expect(endpoint).toEqual(fetchCall[0]);
    });

    test('Use authorization server without leading slash', async () => {
        const endpoint = 'http://authz.server:8181/v1/data/policy/path';
        const middleware = opaExpress(() => ({
            hostname: 'authz.server',
            port: 8181,
            policyPath: 'policy/path',
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);

        expect(fetch).toHaveBeenCalledTimes(1);
        const fetchCall = fetch.mock.calls[0];
        expect(endpoint).toEqual(fetchCall[0]);
    });

    test('Should include request body', async () => {
        const middleware = opaExpress(() => ({
            ...endpointOpts,
            includeBody: true,
        }));

        midObjects.req.body = {
            someValues: 123,
            otherValues: 'abc',
        };

        await middleware(midObjects.req, midObjects.res, midObjects.next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(midObjects.req.body).toEqual(fetchBody.input.request.body);
    });

    test('Should not include request body', async () => {
        const middleware = opaExpress(() => ({
            ...endpointOpts,
            includeBody: false,
        }));

        midObjects.req.body = {
            someValues: 123,
            otherValues: 'abc',
        };

        await middleware(midObjects.req, midObjects.res, midObjects.next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(undefined).toEqual(fetchBody.input.request.body);
    });

    test('Should include request headers', async () => {
        const middleware = opaExpress(() => ({
            ...endpointOpts,
            includeHeaders: true,
        }));

        midObjects.req.headers = {
            'some-header': 123,
            'other-header': 'abc',
        };

        await middleware(midObjects.req, midObjects.res, midObjects.next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(midObjects.req.headers).toEqual(fetchBody.input.request.headers);
    });

    test('Should not include request headers', async () => {
        const middleware = opaExpress(() => ({
            ...endpointOpts,
            includeHeaders: false,
        }));

        midObjects.req.headers = {
            'some-header': 123,
            'other-header': 'abc',
        };

        await middleware(midObjects.req, midObjects.res, midObjects.next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(undefined).toEqual(fetchBody.input.request.headers);
    });

    test('Should add enrich values', async () => {
        const middleware = opaExpress(() => ({
            ...endpointOpts,
            enrich: {
                data: 123,
            },
        }));


        await middleware(midObjects.req, midObjects.res, midObjects.next);

        const fetchCall = fetch.mock.calls[0];
        const fetchBody = JSON.parse(fetchCall[1].body);
        expect(123).toEqual(fetchBody.input.data);
    });
});

describe('Validating next call', () => {
    test('Filter request should call next middleware', async () => {
        const middleware = opaExpress(() => ({
            enable: false,
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectSuccess();
    });

    test('Allowed response should call next middleware', async () => {
        const allowResponse = {
            result: true,
        };
        const allowBody = JSON.stringify(allowResponse);
        fetch.mockReturnValue(Promise.resolve(new Response(allowBody)));

        const middleware = opaExpress(() => ({
            ...endpointOpts,
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectSuccess();
    });

    test('Denied response should not call next middleware', async () => {
        const denyResponse = {
            result: false,
        };
        const denyBody = JSON.stringify(denyResponse);
        fetch.mockReturnValue(Promise.resolve(new Response(denyBody)));

        const middleware = opaExpress(() => ({
            ...endpointOpts,
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectFailure();
    });

    test('Allow on fail should call next middleware', async () => {
        fetch.mockReturnValue(Promise.reject(new Error()));

        const middleware = opaExpress(() => ({
            ...endpointOpts,
            allowOnFailure: true,
        }));

        await middleware(midObjects.req, midObjects.res, midObjects.next);
        expectSuccess();
    });

    test('Deny on fail should not call next middleware', async () => {
        fetch.mockReturnValue(Promise.reject(new Error()));

        const middleware = opaExpress(() => ({
            ...endpointOpts,
            allowOnFailure: false,
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
