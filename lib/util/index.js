'use strict';

var miloCore = require('milo-core')
    , deprecate = require('./deprecate');

/**
 * `milo.util`
 */
var util = {
    logger: miloCore.util.logger,
    request: require('./request'),
    websocket: require('./websocket'),
    check: miloCore.util.check,
    error: deprecate(require('./error'), 'milo.util.error is DEPRECATED and will be REMOVED soon!'),
    count: deprecate(require('./unique_id'), 'milo.util.count is DEPRECATED! Use milo.util.uniqueId instead'),
    uniqueId: require('./unique_id'),
    componentName: require('./component_name'),
    dom: require('./dom'),
    domListeners: require('./dom_listeners'),
    selection: require('./selection'),
    fragment: require('./fragment'),
    jsonParse: deprecate(require('./json_parse'), 'milo.util.jsonParse is DEPRECATED! Use _.jsonParse instead'),
    storage: require('./storage'),
    domReady: require('./domready'),
    dragDrop: require('./dragdrop'),
    deprecate: deprecate,
    doT: miloCore.util.doT,
    destroy: util_destroy,
    queryString: require('querystringparser')
};

module.exports = util;


function util_destroy() {
    util.request.destroy();
    util.dragDrop.destroy();
}
