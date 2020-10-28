const express = require('express');
const bodyParser = require('body-parser');
const extAuthz = require('opa-express-middleware');

const app = express();
const jsonParserMiddleware = bodyParser.json();
const extAuthzMiddleware = extAuthz((req) => ({
    authzServer: 'http://localhost:8181/v1/data/authz',
    filter: req.method === 'GET',
    enrich: {serviceId: 1},
}));
app.use(jsonParserMiddleware, extAuthzMiddleware);

app.all('/', (req, res) => {
    res.send('allowed');
});

const port = 3000;
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
