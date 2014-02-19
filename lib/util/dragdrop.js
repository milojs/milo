'use strict';

var Component = require('../components/c_class')
    , dragDropConfig = require('../config').dragDrop
    , componentMetaRegexString = dragDropConfig.dataTypes.componentMetaRegexString
    , componentMetaRegexModifier = dragDropConfig.dataTypes.componentMetaRegexModifier
    , componentMetaRegex = RegExp(componentMetaRegexString, componentMetaRegexModifier)
    , jsonParse = require('./json_parse')
    , _ = require('mol-proto');

module.exports = DragDropDataTransfer;

/**
 * Wrapper for event.dataTransfer of drag-drop HTML API
 *
 * @constructor
 * @param {DataTransfer} dataTransfer
 * @return {DragDropDataTransfer}
 */
function DragDropDataTransfer(dataTransfer) {
    this.dataTransfer = dataTransfer;
    this.types = dataTransfer.types;
}

/**
 * Usage:
 * var testDT = new DragDropDataTransfer(event.dataTransfer);
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
    setDropEffect: DragDropDataTransfer$setDropEffect,
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
    // HTML drag-drop API converts to lowercase anyway,
    // we do it to be consistent in case some browsers don't
    var compClass = component.constructor.name.toLowerCase()
        , compName = component.name.toLowerCase();

    var paramsStr = _.toQueryString(params);
    var dataType = dragDropConfig.dataTypes.componentMetaTemplate
                    .replace('%class', compClass)
                    .replace('%name', compName)
                    .replace('%params', paramsStr);

    this.dataTransfer.setData(dataType, data || '');

    return dataType;
}


function DragDropDataTransfer$getComponentMeta() {
    var dataType = _.find(this.types, function (dType) {
        return componentMetaRegex.test(dType);
    });
    if (!dataType) return;

    var match = dataType.match(componentMetaRegex);

    return {
        compClass: match[1],
        compName: match[2],
        params: _.fromQueryString(match[3]),
        dataType: dataType,
        data: this.dataTransfer.getData(dataType)
    };
}


// as defined here: https://developer.mozilla.org/en-US/docs/DragDrop/Drag_Operations#dragstart
function DragDropDataTransfer$getAllowedEffects() {
    return this.dataTransfer.effectAllowed;
}


function DragDropDataTransfer$setAllowedEffects(effects) {
    this.dataTransfer.effectAllowed = effects;
}


// TODO figure out and return allowed effect if effect was not passed
function DragDropDataTransfer$setDropEffect(effect) {
    this.dataTransfer.dropEffect = effect;
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
