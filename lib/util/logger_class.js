'use strict';

// ### Logger Class

// Properties:

// - level

//   - 0 - error
//   - 1 - warn
//   - 2 - info
//   - 3 - debug (default)

// - enabled

//   true by default. Set to false to disable all logging in browser console.


var _ = require('mol-proto');


/**
 * Log levels.
 */

var levels = [
    'error',
    'warn',
    'info',
    'debug'
];

var maxLevelLength = Math.max.apply(Math, levels.map(function(level) { return level.length; }));

/**
 * Colors for log levels.
 */

var colors = [
    31,
    33,
    36,
    90
];

/**
 * Pads the nice output to the longest log level.
 */
function pad(str) {
    if (str.length < maxLevelLength)
        return str + new Array(maxLevelLength - str.length + 1).join(' ');

    return str;
};


function colored(str, color) {
    return '\x1B[' + color + 'm' + str + ' -\x1B[39m';
}


var DEFAULT_OPTIONS = {
    level: 3,
    throwLevel: -1, // never throw
    enabled: true,
    logPrefix: ''
}


/**
 * Logger (console).
 *
 * @api public
 */
var Logger = function (opts) {
    _.extend(this, DEFAULT_OPTIONS);
    _.extend(this, opts || {});
};


/**
 * Log method.
 *
 * @api public
 */

Logger.prototype.log = function (type) {
    var index = levels.indexOf(type);

    if (! this.enabled || index > this.level)
        return this;

    var args = _.slice(arguments, 1);

    if (index <= this.throwLevel)
        throw new Error([this.logPrefix, type + ':'].concat(args).join(' '));

    console.log.apply(
          console
        , [ this.logPrefixColor
              ? '   ' + colored(this.logPrefix, this.logPrefixColor)
              : this.logPrefix,
            (this.colors
              ? ' ' + colored(pad(type), colors[index])
              : type) + ':'
          ].concat(args)
    );

    return this;
};

/**
 * Generate methods.
 */

levels.forEach(function (name) {
    Logger.prototype[name] = function () {
        this.log.apply(this, [name].concat(_.toArray(arguments)));
    };
});


module.exports = Logger;
