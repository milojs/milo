'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');

var COMBO_LIST_CHANGE_MESSAGE = 'mlcombolistchange';


var MLComboList = Component.createComponentClass('MLComboList', {
    dom: {
        cls: 'ml-ui-combo-list'
    },
    data: {
        get: MLComboList_get,
        set: MLComboList_set,
        del: MLComboList_del,
        event: COMBO_LIST_CHANGE_MESSAGE
    },
    events: undefined,
    model: {
        messages: {
            '***': { subscriber: onItemsChange, context: 'owner'}
        }
    },
    template: {
        template: '<div ml-bind="MLList:list">\
                       <div ml-bind="[item]:item" class="list-item">\
                           <span ml-bind="[data]:label"></span>\
                           <span ml-bind="[events]:deleteBtn" class="glyphicon glyphicon-remove"></span>\
                       </div>\
                   </div>\
                   <div ml-bind="MLSuperCombo:combo"></div>'
    }
});


componentsRegistry.add(MLComboList);

module.exports = MLComboList;


_.extendProto(MLComboList, {
    init: MLComboList$init,
    setOptions: MLComboList$setOptions
});


function MLComboList$init() {
    Component.prototype.init.apply(this, arguments);
    this.model.set([]);
    this.on('childrenbound', onChildrenBound);
    
}


function MLComboList$setOptions(arr) {
    this._combo.setOptions(arr);
}


function onChildrenBound() {
    this.off('childrenbound', onChildrenBound);
    this.template.render().binder();
    componentSetup.call(this);
}

function componentSetup() {
    _.defineProperties(this, {
        '_combo': this.container.scope.combo,
        '_list': this.container.scope.list
    });

    milo.minder(this._list.model, '<<<->>>', this.model);
    this._combo.data.on('', {subscriber: onComboChange, context: this });   
}

function onComboChange(msg, data) {
    // if (data.newValue) {
    //  var listArr = this._list.model.get();
    //  var newArr = listArr.concat(data.newValue);
    //  this._list.model.set(newArr);
    // }
    if (data.newValue)
        this._list.model.push(data.newValue);
    this._combo.data.del();
}

function onItemsChange(msg, data) {
    //if (data.type == 'splice')
        this.data.getMessageSource().dispatchMessage(COMBO_LIST_CHANGE_MESSAGE);
}

function MLComboList_get() {
    var model = this.model.get();
    return model ? _.clone(model) : undefined;
}

function MLComboList_set(value) {
    this.model.set(value);
}

function MLComboList_del() {
    return this.model.set([]);
}


