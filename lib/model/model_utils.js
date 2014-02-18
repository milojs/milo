'use strict';


var modelUtils = {
    normalizeSpliceIndex: normalizeSpliceIndex
};

module.exports = modelUtils;


function normalizeSpliceIndex(spliceIndex, length) {
    return spliceIndex > length
            ? length
            : spliceIndex >= 0
                ? spliceIndex
                : spliceIndex + length > 0
                    ? spliceIndex + length
                    : 0;
}
