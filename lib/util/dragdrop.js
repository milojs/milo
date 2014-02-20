'use strict';

var Component = require('../components/c_class')
    , dragDropConfig = require('../config').dragDrop
    , componentMetaRegex = dragDropConfig.dataTypes.componentMetaRegex
    , jsonParse = require('./json_parse')
    , _ = require('mol-proto')
    , base32 = require('base32');


module.exports = DragDropDataTransfer;


/**
 * Wrapper for event.dataTransfer of drag-drop HTML API
 *
 * @constructor
 * @param {event} DOM event
 * @return {DragDropDataTransfer}
 */
function DragDropDataTransfer(event) {
    this.event = event;
    this.dataTransfer = event.dataTransfer;
    this.types = event.dataTransfer.types;
}

/**
 * Usage:
 * var testDT = new DragDropDataTransfer(event);
 * testDT.setComponentMeta(newComponent, {test: 'test', test2: 'test2'});
 * testDT.getComponentMeta();
 */

_.extend(DragDropDataTransfer, {
    componentDataType: DragDropDataTransfer$$componentDataType
});

_.extendProto(DragDropDataTransfer, {
    isComponent: DragDropDataTransfer$isComponent,
    getComponentState: DragDropDataTransfer$getComponentState,
    setComponentState: DragDropDataTransfer$setComponentState,
    getComponentMeta: DragDropDataTransfer$getComponentMeta,
    setComponentMeta: DragDropDataTransfer$setComponentMeta,
    getAllowedEffects: DragDropDataTransfer$getAllowedEffects,
    setAllowedEffects: DragDropDataTransfer$setAllowedEffects,
    getDropEffect: DragDropDataTransfer$getDropEffect,
    setDropEffect: DragDropDataTransfer$setDropEffect,
    isEffectAllowed: DragDropDataTransfer$isEffectAllowed,
    getData: DragDropDataTransfer$getData,
    setData: DragDropDataTransfer$setData,
    clearData: DragDropDataTransfer$clearData
});


function DragDropDataTransfer$$componentDataType() {
    return dragDropConfig.dataTypes.component;
}


function DragDropDataTransfer$isComponent() {
    return _.indexOf(this.types, DragDropDataTransfer.componentDataType()) >= 0;
}


function DragDropDataTransfer$getComponentState() {
    var dataType = DragDropDataTransfer.componentDataType()
        , stateStr = this.dataTransfer.getData(dataType)
        , state = jsonParse(stateStr);

    return state;
}


function DragDropDataTransfer$setComponentState(component, stateStr){
    if (! stateStr) {
        var state = component.getTransferState()
        stateStr = JSON.stringify(state)
    }
    var dataType = DragDropDataTransfer.componentDataType();

    stateStr && this.dataTransfer.setData(dataType, stateStr);
    this.dataTransfer.setData('text/html', component.el.outerHTML);
    return stateStr;
}


function DragDropDataTransfer$setComponentMeta(component, params, data) {
    var meta = _componentMeta(component);

    var paramsStr = _.toQueryString(params);
    var dataType = dragDropConfig.dataTypes.componentMetaTemplate
                    .replace('%class', _encode(meta.compClass || ''))
                    .replace('%name', _encode(meta.compName || ''))
                    .replace('%params', _encode(paramsStr || ''));

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


function DragDropDataTransfer$getComponentMeta() {
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
        metaData: this.dataTransfer.getData(metaDataType)
    };
}


// as defined here: https://developer.mozilla.org/en-US/docs/DragDrop/Drag_Operations#dragstart
function DragDropDataTransfer$getAllowedEffects() {
    return this.dataTransfer.effectAllowed;
}


function DragDropDataTransfer$setAllowedEffects(effects) {
    this.dataTransfer.effectAllowed = effects;
}


function DragDropDataTransfer$getDropEffect() {
    return this.dataTransfer.dropEffect;
}


function DragDropDataTransfer$setDropEffect(effect) {
    this.dataTransfer.dropEffect = effect;
}


function DragDropDataTransfer$isEffectAllowed(effect) {
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


function DragDropDataTransfer$getData(dataType) {
    this.dataTransfer.getData(dataType);
}


function DragDropDataTransfer$setData(dataType, dataStr) {
    this.dataTransfer.setData(dataType, dataStr);
}


function DragDropDataTransfer$clearData(dataType) {
    this.dataTransfer.clearData(dataType);
}
