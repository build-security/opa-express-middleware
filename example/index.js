const express = require('express');
const bodyParser = require('body-parser');
const extAuthz = require('@build-security/opa-express-middleware');

const app = express();
const jsonParserMiddleware = bodyParser.json();
const extAuthzMiddleware = extAuthz.authorize((req) => ({
    port: 8181,
    hostname: 'http://localhost',
    policyPath: '/mypolicy/allow',

    enable: req.method === 'GET',
    enrich: {serviceId: 1},
}));

// Add the extAuthzMiddleware here to apply to all requests.
// This has one drawback: route parameters will not be available
// to the authz policy as input.
app.use(jsonParserMiddleware);


// Applying the middleware per route makes the route parameters "region" and "userId"
// available to the authz policy as input.
app.get('/region/:region/users/:userId', extAuthz.permissions('user.read'), extAuthzMiddleware, (req, res) => {
    res.send('allowed');
});

const port = 3000;
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
