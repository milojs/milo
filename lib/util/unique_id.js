'use strict';

var timestamp = Date.now()
    , count = ''
    , uniqueID = '' + timestamp;

function uniqueCount() {
    var newTimestamp = Date.now();
    uniqueID = '' + newTimestamp;
    if (timestamp == newTimestamp) {
        count = count === '' ? 0 : count + 1;
        uniqueID += '_' + count;
    } else {
        timestamp = newTimestamp;
        count = '';
    }

    return uniqueID;
}

uniqueCount.get = function() {
    return uniqueID;
}

module.exports = uniqueCount;
