'use strict';


var miloCore = require('milo-core')
    , _ = miloCore.proto
    , logger = miloCore.util.logger
    , config = require('../config');


module.exports = function deprecate(fn, message) {
    var warned;
    switch (typeof fn) {
        case 'object':
            return _.mapKeys(fn, function(f) { return deprecate(f, message); });
        case 'function':
            for (var prop in fn)
                deprecated[prop] = deprecate(fn[prop], message);
            return deprecated;
        default:
            return fn;
    }


    function deprecated() {
        if (config.deprecationWarning
            && (!warned || config.deprecationWarning == 'always')) {
            logger.error(message || 'Function ' + fn.name + ' is DEPRECATED');
            warned = true;
        }
        return fn.apply(this, arguments);
    }
};
