'use strict';


// <a name="config"></a>
// milo.config
// -----------

// It is the function that allows to change milo configurations and also
// access them on config's properties.

// ```javascript
// milo.config({
//     attrs: {
//         bind: 'ml-bind',
//         load: 'ml-load'
//     }
// });
// ```


var _ = require('mol-proto')
    , doT = require('dot');


module.exports = config;

function config(options) {
    _.deepExtend(config, options);
}

config({
    attrs: {
        bind: 'ml-bind',
        load: 'ml-load'
    },
    componentRef: '___milo_component',
    componentPrefix: 'milo_',
    template: {
        compile: doT.compile
    },
    domStorage: {
        typeSuffix: ':___milo_data_type',
        prefixSeparator: '/'
    },
    check: true
});
