
# opa-express-middleware
## Abstract
Node.js express middleware to authorize API requests using a 3rd party policy engine (OPA).
If you're not familiar with OPA, please [learn more](https://www.openpolicyagent.org/).

## Data Flow
![enter image description here](https://github.com/build-security/opa-express-middleware/blob/main/Data%20flow.png)

## Usage
### Simple usage
```js
const express = require('express');
const bodyParser = require('body-parser');
const extAuthz = require('@build-security/opa-express-middleware');
const port = 3000;

const app = express();

const extAuthzMiddleware = extAuthz((req) => ({
    authzServer: "http://localhost:8181/v1/data/authz",
}));

app.use(bodyParser.json(), extAuthzMiddleware);

app.listen(port, () => {
  console.log(`Now listening on http://localhost:${port}`)
});
```
### Mandatory configuration

 1. `authzServer`: The hostname of the OPA service and the path of the policy.

### Optional configuration
 1. `allowOnFail`: Boolean. "Fail open" mechanism to allow access to the API in case the policy engine is not reachable. **Default is false**.
 2. `includeBody`: Boolean. Whether or not to pass the request body to the policy engine. **Default is true**.
 3. `includeHeaders`: Boolean. Whether or not to pass the request headers to the policy engine. **Default is true**
 4. `timeout`: Boolean. Amount of time to wait before request is abandoned and request is declared as failed. **Default is 1000ms**.
 5. `filter`: Boolean. Whether or not to consult with the policy engine for the specific request. **Default is true**
 6. `enrich`: Object. An object to attach to the request that is being sent to the policy engine. **Default is an empty object {}**

### Advanced example
The following example will consult with the policy engine only for GET requests, and will add a field named "serviceId" with the value 1 to the request.
```js
const express = require('express');
const bodyParser = require('body-parser');
const extAuthz = require('@build-security/opa-express-middleware');

const app = express();

const extAuthzMiddleware = extAuthz((req) => ({
    authzServer: "http://localhost:8181/v1/data/authz",
    filter: req.method === "GET",
    enrich: { serviceId: 1 }
}));

app.use(bodyParser.json(), extAuthzMiddleware);
```

### OPA Request example
```
{
    "input": {
        "request": {
            "method": "GET",
            "query": {
                "querykey": "queryvalue"
            },
            "path": "/some/path",
            "scheme": "http",
            "host": "localhost",
            "body": {
                "bodykey": "bodyvalue"
            },
            "headers": {
                "content-type": "application/json",
                "user-agent": "PostmanRuntime/7.26.5",
                "accept": "*/*",
                "cache-control": "no-cache",
                "host": "localhost:3000",
                "accept-encoding": "gzip, deflate, br",
                "connection": "keep-alive",
                "content-length": "24"
            }
        },
        "source": {
            "port": 63405,
            "address": "::1"
        },
        "destination": {
            "port": 3000,
            "address": "::1"
        },
        "serviceId": 1
    }
}
```
