(function () {

'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');

var INPUT_LIST_CHANGE_MESSAGE = 'mlinputlistchange';

var asyncHandler = function (value, callback) {callback(value);};

var MLInputList = Component.createComponentClass('MLInputList', {
    dom: {
        cls: 'ml-ui-input-list'
    },
    data: {
        get: MLInputList_get,
        set: MLInputList_set,
        del: MLInputList_del,
        event: INPUT_LIST_CHANGE_MESSAGE
    },
    events: undefined,
    model: {
        messages: {
            '**': { subscriber: onItemsChange, context: 'owner' }
        }
    },
    template: {
        template: '\
            <div ml-bind="MLList:list">\
                <div ml-bind="MLListItem:item" class="list-item">\
                    <span ml-bind="[data]:label"></span>\
                    <span ml-bind="[events]:deleteBtn" class="glyphicon glyphicon-remove"></span>\
                </div>\
            </div>\
            <input type="text" ml-bind="MLInput:input" class="form-control">\
            <button ml-bind="MLButton:button" class="btn btn-default">\
                Add\
            </button>'
    }
});

componentsRegistry.add(MLInputList);

module.exports = MLInputList;

_.extendProto(MLInputList, {
    init: MLInputList$init,
    setAsync: MLInputList$setAsync
});

function MLInputList$init() {
    Component.prototype.init.apply(this, arguments);
    this.model.set([]);
    this.on('childrenbound', onChildrenBound);
}

function MLInputList$setAsync(newHandler) {
    asyncHandler = newHandler || asyncHandler;
}

function onChildrenBound() {
    this.off('childrenbound', onChildrenBound);
    this.template.render().binder();
    componentSetup.call(this);
}

function componentSetup() {
    _.defineProperties(this, {
        '_input': this.container.scope.input,
        '_button': this.container.scope.button,
        '_list': this.container.scope.list
    });
    milo.minder(this._list.model, '<<<->>>', this.model);
    this._button.events.on('click', {subscriber: onClick, context: this });   
}

function onClick(msg) {
    var value = this._input.data.get(0);
    if (this._input.data)
        asyncHandler(value, function (label, value) {
            this._list.model.push({ label: label, value: value });
        }.bind(this));
    this._input.data.del();
}

function onItemsChange(msg, data) {
    this.data.getMessageSource().dispatchMessage(INPUT_LIST_CHANGE_MESSAGE);
}

function MLInputList_get() {
    var model = this.model.get();
    return model ? _.clone(model) : undefined;
}

function MLInputList_set(value) {
    this.model.set(value);
}

function MLInputList_del() {
    return this.model.set([]);
}

})();