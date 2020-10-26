const fetch = require('node-fetch')

module.exports = authz

function authz(options = () => {}) {
    const defaultOptions = {
        allowOnFail: false,
        includeBody: true,
        includeHeaders: true,
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

        const incomingReq = {
            method: req.method,
            query: req.query,
            path: req.path
        };

        if (opts.includeBody) {
            incomingReq.body = req.body;
        }

        if (opts.includeHeaders) {
            incomingReq.headers = req.headers;
        }

        const outgoingReq = {
            input: {
                request: { ...incomingReq, ...opts.enrich }
            }
        };

        return fetch(opts.authzServer, {
                method: 'POST',
                body: JSON.stringify(outgoingReq),
                headers: { 'Content-Type': 'application/json' },
            })
            .then(authzResponse => authzResponse.json())
            .catch(() => {
                return {
                    allow: opts.allowOnFail
                }
            })
            .then(authzResponseJson => {
                if (authzResponseJson.result.allow) {
                    next();
                } else {
                    res.status(403).send("Unauthorized");
                }
            });
    }
}
