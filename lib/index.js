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
        allowOnFailure: false,
        includeBody: true,
        includeHeaders: true,
        timeout: 1000,
        enable: true,
        enrich: {},
    };

    return (req, res, next) => {
        reqOpts = options(req);
        const opts = {...defaultOptions, ...reqOpts};

        if (!opts.enable) {
            next();
            return;
        }

        const reqAttributes = getRequestStructure(req, opts.includeBody, opts.includeHeaders);
        const sourcePeer = getPeerStructure(req.connection.remoteAddress, req.connection.remotePort);
        const destPeer = getPeerStructure(req.connection.localAddress, req.connection.localPort);
        const resources = getResourcesStructure(req.params)

        const authzRequest = {
            input: {
                request: reqAttributes,
                source: sourcePeer,
                destination: destPeer,
                resources: resources,
                ...opts.enrich,
            },
        };

        return postJson(authzEndpoint(opts.hostname, opts.port, opts.policyPath), authzRequest, opts.timeout)
            .catch((_) => {
                return {
                    result: opts.allowOnFailure,
                };
            })
            .then((authzResponse) => {
                if (authzResponse.result === true) {
                    next();
                } else {
                    res.status(403).send('Unauthorized');
                }
            });
    };
}

/**
 * Constructs PDP endpoint for authz
 * @param {string} hostname Hostname of PDP that serves authz decisions
 * @param {number} port Port of PDP that serves authz decisions
 * @param {string} policyPath Path to policy that is to be evaluated for authz decision
 * @returns {string} The PDP endpoint that serves authz decisions
 */
function authzEndpoint(hostname, port, policyPath) {
    if (!hostname.includes('://')) {
        hostname = 'http://'.concat(hostname)
    }

    hostport = hostname.concat(':'.concat(port.toString()))

    if (!policyPath.startsWith('/')) {
        policyPath = '/'.concat(policyPath)
    }

    policyPath = '/v1/data'.concat(policyPath)

    endpoint = new URL(policyPath, hostport)

    return endpoint.href
}

/**
 * Makes request to PDP endpoint
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
 * Generates request structure
 * @param {any} req express js request
 * @param {bool} includeBody should include request body
 * @param {bool} includeHeaders should include request headers
 * @return {any} request structure JSON
 */
function getRequestStructure(req, includeBody, includeHeaders) {
    const httpAttributes = {
        method: req.method,
        query: req.query,
        path: req.path,
        scheme: req.protocol,
        host: req.hostname,
    };

    if (includeBody) {
        httpAttributes.body = req.body;
    }

    if (includeHeaders) {
        httpAttributes.headers = req.headers;
    }

    return httpAttributes;
}

/**
 * Generates peer structure
 * @param {string} address Peer address
 * @param {string} port Peer port
 * @return {any} peer structure JSON
 */
function getPeerStructure(address, port) {
    return {
        port: port,
        ipAddress: address,
    };
}

/**
 * Generates resources structure
 * @param {object} params 
 * @returns {any} resources structure JSON
 */
function getResourcesStructure(params) {
    return {
        attributes: params,
    };
}
