'use strict';


module.exports = MockDragDropEvent;


function MockDragDropEvent(eventType, target) {
    this.eventType = eventType;
    if (target) this.target = target;
    this.dataTransfer = new MockDataTransfer(eventType);
};


_.extendProto(MockDragDropEvent, {
    stopPropagation: function(){},
    preventDefault: function(){},
    _setDrop: _setDrop,
    _event: _event,
});


function _event(eventType) {
    this.eventType = eventType;
    return this;
}


/**
 * set parameters of drop event
 * @param {Object} opts clientX, clientY, target, relative (if coordinates are relative to the target)
 */
function _setDrop(opts) {
    this.eventType = 'drop';
    this.target = opts.target;
    if (opts.clientX === undefined || opts.clientY === undefined) return;

    this.clientX = opts.clientX;
    this.clientY = opts.clientY;
    var rect = opts.target.getBoundingClientRect();
    if (opts.relative) {
        if (this.clientX >= 0) this.clientX += rect.left;
        else this.clientX += rect.left + rect.width;
        if (this.clientY >= 0) this.clientY += rect.top;
        else this.clientY += rect.top + rect.height;
    }

    if (this.clientX < rect.left || this.clientX > rect.left + rect.width ||
        this.clientY < rect.top || this.clientY > rect.top + rect.height) {
        throw new Error('drop: coordinates are outside of the target');
    }
}


function MockDataTransfer(eventType) {
    this.types = [];
    this.effectAllowed = 'uninitialized';
    this.dropEffect = 'copy';
    this.__eventType = eventType;
    this.__mock_data = {};
}


_.extendProto(MockDataTransfer, {
    getData: getData,
    setData: setData,
    clearData: clearData
});


var dataAvailable = {
    'dragstart': true,
    'drag': true,
    'dragend': true,
    'dragenter': false,
    'dragover': false,
    'dragleave': false,
    'drop': true
}


function getData(dataType) {
    dataType = dataType.toLowerCase();
    return dataAvailable[this.__eventType]
            ? this.__mock_data[dataType]
            : null; 
}


function setData(dataType, data) {
    if (data && typeof data != 'string') throw new Error('data should be string');
    dataType = dataType.toLowerCase();
    if (dataAvailable[this.__eventType]) {
        if (!this.__mock_data[dataType]) this.types.push(dataType);
        this.__mock_data[dataType] = data;
    }
}


function clearData(dataType) {
    dataType = dataType.toLowerCase();
    if (dataAvailable[this.__eventType])
        delete this.__mock_data[dataType];
}
