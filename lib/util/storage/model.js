'use strict';

var miloCore = require('milo-core')
    , Model = miloCore.Model
    , _ = miloCore.proto;

Model.registerWithDOMStorage = Model$$registerWithDOMStorage;


function Model$$registerWithDOMStorage() {
    var DOMStorage = require('./index');
    DOMStorage.registerDataType('Model', Model_domStorageSerializer, Model_domStorageParser);
    DOMStorage.registerDataType('ModelPath', Model_domStorageSerializer, Model_domStorageParser, 'Model');
}


function Model_domStorageSerializer(value) {
    var data = value.get();
    return JSON.stringify(data);
}


function Model_domStorageParser(valueStr) {
    var data = _.jsonParse(valueStr);
    return new Model(data);
}
