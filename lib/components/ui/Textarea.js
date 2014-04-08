'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto')
    , logger = require('../../util/logger');


var MLTextarea = Component.createComponentClass('MLTextarea', {
    data: undefined,
    events: undefined,
    dom: {
        cls: 'ml-ui-textarea'
    }
});

componentsRegistry.add(MLTextarea);

module.exports = MLTextarea;


_.extendProto(MLTextarea, {
    startAutoresize: MLTextarea$startAutoresize,
    stopAutoresize: MLTextarea$stopAutoresize
});


function MLTextarea$startAutoresize(options) {
    return;
    if (this._autoresize)
        return logger.warn('MLTextarea startAutoresize: autoresize is already on');
    this._autoresize = true;
    this._autoresizeOptions = options;

    this.events.on('input', { subscriber: onTextChange, context: this });
}


function onTextChange() {
    var str = this.el.value
        , lines = str.split(/\r\n|\r|\n/)
        , minLines = this._autoresizeOptions.minLines
        , maxLines = this._autoresizeOptions.maxLines;

    console.log(lines.length, minLines, maxLines);

    if (lines.length >= maxLines)
        this.el.rows = maxLines;
    else if (lines.length <= minLines)
        this.el.rows = minLines;
    else {

    }
}


function _linesInString(str) {
    var div = document.createElement('div')
        , thisStyle = window.getComputedStyle(this.el);
    _.extend(div.style, {
        font: thisStyle.font,
        position: 'absolute',
        visibility: 'hidden',
        height: 'auto',
        width: 'auto'
    });
    document.body.appendChild(div);
    var width = div.offsetWidth
        , areaWidth = this.el.offsetWidth;

    return Math.floor();
}


function MLTextarea$stopAutoresize() {
    return;
    if (! this._autoresize)
        return logger.warn('MLTextarea stopAutoresize: autoresize is not on');
}


function MLTextarea$destroy() {
    if (this._autoresize)
        this.stopAutoresize();
    Component.prototype.destroy.apply(this, arguments);
}
