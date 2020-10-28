const fetch = require('node-fetch');

module.exports = authz;

/**
 *
 * @param {function} options
 * Function that called with the request object uppon every connection
 * The function should return opa intergration options
 * @return {function} Express middleware that integreated opa
 */
function authz(options = () => {}) {
    const defaultOptions = {
        allowOnFail: false,
        includeBody: true,
        includeHeaders: true,
        timeout: 1000,
        filter: true,
        enrich: {},
    };

    return (req, res, next) => {
        reqOpts = options(req);
        const opts = {...defaultOptions, ...reqOpts};

        if (!opts.filter) {
            next();
            return;
        }

        const reqAttributes = getRequestStructure(req, opts.includeBody, opts.includeHeaders);
        const sourcePeer = getPeerStructure(req.connection.remoteAddress, req.connection.remotePort);
        const destPeer = getPeerStructure(req.connection.localAddress, req.connection.localPort);

        const authzRequest = {
            input: {
                request: reqAttributes,
                source: sourcePeer,
                destination: destPeer,
                ...opts.enrich,
            },
        };

        return postJson(opts.authzServer, authzRequest, opts.timeout)
            .catch((_) => {
                return {
                    result: {
                        allow: opts.allowOnFail,
                    },
                };
            })
            .then((authzResponse) => {
                if (authzResponse.result && authzResponse.result.allow) {
                    next();
                } else {
                    res.status(403).send('Unauthorized');
                }
            });
    };
}

/**
 *
 * @param {string} url Absolute url of the request
 * @param {object} body Object to send in the request body
 * @param {number} timeout The number of millisecond before the request timeout
 * @return {promise} A promise that resolved with the response object
 */
function postJson(url, body, timeout) {
    return fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
        timeout: timeout,
    })
        .then((authzResponse) => authzResponse.json());
}

/**
 * Generates peer strcuture details
 * @param {string} address Peer address
 * @param {stirng} port Peer port
 * @return {any} peer structure json
 */
function getPeerStructure(address, port) {
    return {
        port: port,
        address: address,
    };
}

/**
 * Generates request strcuture details
 * @param {any} req express js request
 * @param {bool} includeBody should include request body
 * @param {bool} includeHeaders should include request headers
 * @return {any} request structure json
 */
function getRequestStructure(req, includeBody, includeHeaders) {
    const httpAttributes = {
        method: req.method,
        query: req.query,
        path: req.path,
        scheme: req.protocol,
        fragment: '',
        host: req.host,
    };

    if (includeBody) {
        httpAttributes.body = req.body;
    }

    if (includeHeaders) {
        httpAttributes.headers = req.headers;
    }

    return httpAttributes;
}
