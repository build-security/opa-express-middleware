const fetch = require('node-fetch')

module.exports = authz

function authz(options = () => {}) {
    const defaultOptions = {
        allowOnFail: false,
        includeBody: true,
        includeHeaders: true,
        timeout: 1000,
        filter: true,
        enrich: {},
    }

    return (req, res, next) => {
        reqOpts = options(req)
        const opts = { ...defaultOptions, ...reqOpts };

        if (!opts.filter) {
            next();
            return;
        }

        const requestAttributes = {
            method: req.method,
            query: req.query,
            path: req.path
        };

        if (opts.includeBody) {
            requestAttributes.body = req.body;
        }

        if (opts.includeHeaders) {
            requestAttributes.headers = req.headers;
        }

        const authzRequest = {
            input: {
                request: { ...requestAttributes, ...opts.enrich }
            }
        };

        postJson(opts.authzServer, authzRequest, opts.timeout)
        .catch(_ => {
            return {
                result: {
                    allow: opts.allowOnFail
                }
            }
        })
        .then(authzResponse => {
            if (authzResponse.result && authzResponse.result.allow) {
                next();
            } else {
                res.status(403).send("Unauthorized");
            }
        });
    }
}

function postJson(url, body, timeout) {
    return fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        timeout: timeout
    })
    .then(authzResponse => authzResponse.json())
}
