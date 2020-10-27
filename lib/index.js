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

        const requestAttributes = {
            method: req.method,
            query: req.query,
            path: req.path,
        };

        if (opts.includeBody) {
            requestAttributes.body = req.body;
        }

        if (opts.includeHeaders) {
            requestAttributes.headers = req.headers;
        }

        const authzRequest = {
            input: {
                request: {...requestAttributes, ...opts.enrich},
            },
        };

        postJson(opts.authzServer, authzRequest, opts.timeout)
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
