'use strict';

var dragDropConfig = require('../config').dragDrop
    , componentMetaRegex = dragDropConfig.dataTypes.componentMetaRegex
    , _ = require('mol-proto');


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


_.extendProto(DragDropDataTransfer, {
    isComponent: DragDropDataTransfer$isComponent,
    getComponentMeta: DragDropDataTransfer$getComponentMeta
});


function DragDropDataTransfer$isComponent() {
    return _.indexOf(this.types, componentDataType()) >= 0;
}


function DragDropDataTransfer$getComponentMeta() {
    var match;
    var dataType = _.find(this.types, function (dType) {
        match = dType.match(componentMetaRegex);
        return !! match;
    });
    if (!dataType) return;

    return {
        compClass: match[1],
        compName: match[2],
        params: _.fromQueryString(match[3]),
        dataType: dataType
    };
}


var dragDrop = {
    componentDataType: componentDataType,
    componentMetaDataType: componentMetaDataType,
    
    getComponentData: getComponentData,
    setComponentData: setComponentData
}


function componentDataType() {
    return dragDropConfig.dataTypes.component;
}


function componentMetaDataType(component, params) {
    // HTML drag-drop API converts to lowercase anyway,
    // we do it to be consistent in case some browsers don't
    var compClass = component.constructor.name.toLowerCase()
        , compName = component.name.toLowerCase();

    var paramsStr = _.toQueryString(params);
    var dataType = dragDropConfig.dataTypes.componentMetaTemplate
                    .replace('%class', compClass)
                    .replace('%name', compName)
                    .replace('%params', paramsStr);
    return dataType;
}
