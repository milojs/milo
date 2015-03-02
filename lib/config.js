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


var miloCore = require('milo-core')
    , _ = miloCore.proto
    , doT = miloCore.util.doT;


var config = module.exports = miloCore.config;


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
        prefixSeparator: '/',
        root: '',
        messageKey: '___milo_message/',
        messageTimestamp: '___milo_timestamp',
        quotaExceeded: {
            throwError: true,
            message: false
        }
    },
    dragDrop: {
        dataTypes: {
            component: 'x-application/milo/component',
            componentMetaTemplate: 'x-application/milo/component-meta/%class/%name/%params',
            componentMetaRegex: /^x\-application\/milo\/component\-meta\/([a-z0-9]+)\/([a-z0-9]+)\/([a-z0-9]*)$/,
        }
    },
    request: {
        jsonpTimeout: 60000,
        jsonpCallbackPrefix: '___milo_callback_',
        optionsKey: '___milo_options',
        defaults: {
            timeout: 60000
        }
    },
    websocket: {
        rpc: {
            timeout: 15000,
            responsePrefix: 'response_'
        }
    },
    deprecationWarning: 'once'
});
