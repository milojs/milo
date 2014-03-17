'use strict';


module.exports = jsonParse;


/**
 * `milo.util.jsonParse`
 * Safe JSON.parse, returns undefined if JSON.parse throws an exception
 *
 * @param {String} str - JSON string representation of object
 * @return {Object|undefined}
 */
function jsonParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {}
}
