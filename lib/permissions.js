module.exports = permissions;

/**
 *
 * @param {Array} list
 * List of permissions the request require
 * @return {function} Express middleware that adds the permissions on the request
 */
function permissions(...list) {
    return (req, res, next) => {
        req.permissions = list;
        next();
    };
}
