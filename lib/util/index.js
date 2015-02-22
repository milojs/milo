'use strict';

var miloCore = require('milo-core');

/**
 * `milo.util`
 */
var util = {
    logger: miloCore.util.logger,
    request: require('./request'),
    websocket: require('./websocket'),
    check: miloCore.util.check,
    error: require('./error'), // deprecated
    count: require('./count'), // deprecated
    uniqueId: require('./count'),
    componentName: require('./component_name'),
    dom: require('./dom'),
    domListeners: require('./dom_listeners'),
    selection: require('./selection'),
    fragment: require('./fragment'),
    jsonParse: require('./json_parse'), // deprecated
    storage: require('./storage'),
    domReady: require('./domready'),
    dragDrop: require('./dragdrop'),
    dialog: require('../components/ui/bootstrap/Dialog'), // deprecated - should be used from registry
    alert: require('../components/ui/bootstrap/Alert'), // deprecated - should be used from registry
    doT: miloCore.util.doT,
    destroy: util_destroy
};

module.exports = util;


function util_destroy() {
    util.request.destroy();
    util.dragDrop.destroy();
}
