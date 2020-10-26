const express = require('express');
const bodyParser = require('body-parser');
const extAuthz = require('opa-express-middleware');

const app = express();
const jsonParserMiddleware = bodyParser.json();
const extAuthzMiddleware = extAuthz((req) => ({
    includeBody: true,
    includeHeaders: true,
    authzServer: "http://localhost:8181/v1/data/amir",
    filter: req.method === "GET",
    enrich: { serviceID: 1 }
}));
app.use(jsonParserMiddleware, extAuthzMiddleware);

app.all('/', (req, res) => {
    res.send("amir")
});

const port = 3000;
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})