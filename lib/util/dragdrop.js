'use strict';

var Component = require('../components/c_class')
    , Messenger = require('../messenger')
    , dragDropConfig = require('../config').dragDrop
    , componentMetaRegex = dragDropConfig.dataTypes.componentMetaRegex
    , jsonParse = require('./json_parse')
    , _ = require('mol-proto')
    , base32 = require('base32');


module.exports = DragDrop;


/**
 * Wrapper for event.dataTransfer of drag-drop HTML API
 *
 * @constructor
 * @param {event} DOM event
 * @return {DragDrop}
 */
function DragDrop(event) {
    this.event = event;
    this.dataTransfer = event.dataTransfer;
    this.types = event.dataTransfer.types;
}

/**
 * Usage:
 * var testDT = new DragDrop(event);
 * testDT.setComponentMeta(newComponent, {test: 'test', test2: 'test2'});
 * testDT.getComponentMeta();
 */

_.extend(DragDrop, {
    componentDataType: DragDrop$$componentDataType
});

_.extendProto(DragDrop, {
    isComponent: DragDrop$isComponent,
    getComponentState: DragDrop$getComponentState,
    setComponentState: DragDrop$setComponentState,
    getComponentMeta: DragDrop$getComponentMeta,
    setComponentMeta: DragDrop$setComponentMeta,
    getAllowedEffects: DragDrop$getAllowedEffects,
    setAllowedEffects: DragDrop$setAllowedEffects,
    getDropEffect: DragDrop$getDropEffect,
    setDropEffect: DragDrop$setDropEffect,
    isEffectAllowed: DragDrop$isEffectAllowed,
    getData: DragDrop$getData,
    setData: DragDrop$setData,
    clearData: DragDrop$clearData
});


function DragDrop$$componentDataType() {
    return dragDropConfig.dataTypes.component;
}


function DragDrop$isComponent() {
    return _.indexOf(this.types, DragDrop.componentDataType()) >= 0;
}


function DragDrop$getComponentState() {
    var dataType = DragDrop.componentDataType()
        , stateStr = this.dataTransfer.getData(dataType)
        , state = jsonParse(stateStr);

    return state;
}


function DragDrop$setComponentState(component, stateStr){
    if (! stateStr) {
        var state = component.getTransferState({ requestedBy: 'drag' });
        stateStr = JSON.stringify(state);
        console.log('setComponentState', stateStr, stateStr.length);
    }
    var dataType = DragDrop.componentDataType();

    stateStr && this.dataTransfer.setData(dataType, stateStr);
    this.dataTransfer.setData('text/html', component.el.outerHTML);
    return stateStr;
}


function DragDrop$setComponentMeta(component, params, data) {
    var meta = _componentMeta(component);

    var paramsStr = _.toQueryString(params);
    var dataType = dragDropConfig.dataTypes.componentMetaTemplate
                    .replace('%class', _encode(meta.compClass || ''))
                    .replace('%name', _encode(meta.compName || ''))
                    .replace('%params', _encode(paramsStr || ''));

    if (data && typeof data == 'object') data = JSON.stringify(data);

    this.dataTransfer.setData(dataType, data || '');

    return dataType;
}


function _encode(str) {
    return base32.encode(str).toLowerCase();
}


function _componentMeta(component) {
    return component.transfer
            ? component.transfer.getComponentMeta()
            : { 
                compClass: component.constructor.name,
                compName: component.name
            };
}


function DragDrop$getComponentMeta() {
    var match;
    var metaDataType = _.find(this.types, function (dType) {
        match = dType.match(componentMetaRegex);
        return !!match;
    });
    if (!metaDataType) return;

    for (var i=1; i<4; i++)
        match[i] = base32.decode(match[i]);

    return {
        compClass: match[1],
        compName: match[2],
        params: _.fromQueryString(match[3]),
        metaDataType: metaDataType,
        metaData: _.jsonParse(this.dataTransfer.getData(metaDataType)) 
                    ? _.jsonParse(this.dataTransfer.getData(metaDataType)) 
                    : this.dataTransfer.getData(metaDataType)
    };
}


// as defined here: https://developer.mozilla.org/en-US/docs/DragDrop/Drag_Operations#dragstart
function DragDrop$getAllowedEffects() {
    return this.dataTransfer.effectAllowed;
}


function DragDrop$setAllowedEffects(effects) {
    this.dataTransfer.effectAllowed = effects;
}


function DragDrop$getDropEffect() {
    return this.dataTransfer.dropEffect;
}


function DragDrop$setDropEffect(effect) {
    this.dataTransfer.dropEffect = effect;
}


function DragDrop$isEffectAllowed(effect) {
    var allowedEffects = this.getAllowedEffects()
        , isCopy = effect == 'copy'
        , isMove = effect == 'move'
        , isLink = effect == 'link'
        , isAllowed = isCopy || isLink || isMove;

    switch (allowedEffects) {
        case 'copy':
        case 'move':
        case 'link':
            return allowedEffects == effect;
        case 'copyLink':
            return isCopy || isLink;
        case 'copyMove':
            return isCopy || isMove;
        case 'linkMove':
            return isLink || isMove;
        case 'all':
        case 'uninitialized':
            return isAllowed;
        case 'none':
            return false;
    }
}


function DragDrop$getData(dataType) {
    this.dataTransfer.getData(dataType);
}


function DragDrop$setData(dataType, dataStr) {
    this.dataTransfer.setData(dataType, dataStr);
}


function DragDrop$clearData(dataType) {
    this.dataTransfer.clearData(dataType);
}


/**
 * Drag drop service compensating for the lack of communication from drop target to drag source in DOM API
 */
var dragDropService = new Messenger;

var _currentDragDrop, _currentDragFacet;

_.extend(DragDrop, {
    service: dragDropService
});


dragDropService.onMessages({
    // data is DragDropDataTransfer instance
    // fired by Drag facet on "dragstart" event
    'dragdropstarted': onDragDropStarted, 
    // data is object with at least dropEffect property
    // fired by Drop facet on "drop" event
    'dragdropcompleted': onDragDropCompleted, 
    // fired by Drag facet on "dragend" event to complete drag
    // if drop happended in another window or if it was cancelled
    'completedragdrop': onCompleteDragDrop
});


_.extend(dragDropService, {
    getCurrentDragDrop: getCurrentDragDrop
});


function onDragDropStarted(msg, data) {
    _currentDragDrop = data.dragDrop;
    _currentDragFacet = data.dragFacet;
}


function onDragDropCompleted(msg, data) {
    _currentDragFacet && _currentDragFacet.postMessageSync('dragdropcompleted', data);
    _currentDragDrop = undefined;
    _currentDragFacet = undefined;
}


function onCompleteDragDrop(msg, data) {
    if (_currentDragDrop)
        dragDropService.postMessageSync('dragdropcompleted', data);
}


function getCurrentDragDrop() {
    return _currentDragDrop;
}
