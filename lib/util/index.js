'use strict';

/**
 * `milo.util`
 */
var util = {
    logger: require('./logger'),
    request: require('./request'),
    websocket: require('./websocket'),
    check: require('./check'),
    error: require('./error'),
    count: require('./count'), // deprecated
    uniqueId: require('./count'),
    componentName: require('./component_name'),
    dom: require('./dom'),
    domListeners: require('./dom_listeners'),
    selection: require('./selection'),
    fragment: require('./fragment'),
    jsonParse: require('./json_parse'),
    storage: require('./storage'),
    domReady: require('./domready'),
    dragDrop: require('./dragdrop'),
    dialog: require('../components/ui/bootstrap/Dialog'),
    alert: require('../components/ui/bootstrap/Alert'),
    doT: require('dot'),
    destroy: util_destroy
};

module.exports = util;


function util_destroy() {
    util.request.destroy();
    util.dragDrop.destroy();
}
