'use strict';

// <a name="utils-logger"></a>
// milo.utils.logger
// -----------

// Application logger that has error, warn, info and debug
// methods, that can be suppressed by setting log level.

// Properties:

// - level

//   - 0 - error
//   - 1 - warn
//   - 2 - info
//   - 3 - debug (default)

// - enabled

//   true by default. Set to false to disable all logging in browser console.


var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;
