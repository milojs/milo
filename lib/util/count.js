// <a name="utils-count"></a>
// milo.utils.count
// ----------------

'use strict';

var timestamp = Date.now()
    , count = ''
    , componentID = '' + timestamp;

function componentCount() {
    var newTimestamp = Date.now();
    componentID = '' + newTimestamp;
    if (timestamp == newTimestamp) {
        count = count === '' ? 0 : count + 1;
        componentID += '_' + count;
    } else {
        timestamp = newTimestamp;
        count = '';
    }

    return componentID;
}

componentCount.get = function() {
    return componentID;
}

module.exports = componentCount;
