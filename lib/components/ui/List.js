'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');

var LIST_CHANGE_MESSAGE = 'mllistchange'
    , DELETE_BUTTON_NAME = 'deleteBtn';


var MLList = Component.createComponentClass('MLList', {
    dom: {
        cls: 'ml-ui-list'
    },
    data: {
        get: MLList_get,
        set: MLList_set,
        del: MLList_del,
        splice: MLList_splice,
        event: LIST_CHANGE_MESSAGE,
    },
    events: undefined,
    model: {
        // messages: {
        //     '**': { subscriber: onItemsChange, context: 'owner' }
        // }
    },
    list: undefined
});


componentsRegistry.add(MLList);

module.exports = MLList;


_.extendProto(MLList, {
    init: MLList$init,
});


function MLList$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
}


function MLList_get() {
    var value = this.model.get();
    return typeof value == 'object' ? _.clone(value) : value;
}

function MLList_set(value) {
    this.data._set(value);
    this.model.set(value);
    _sendChangeMessage.call(this);
    return value;
}

function MLList_del() {
    this.data._del();
    this.model.set([]);
    _sendChangeMessage.call(this);
}

function MLList_splice() {
    this.data._splice.apply(this.data, arguments);
    var removed = this.model.splice.apply(this.model, arguments);
    _sendChangeMessage.call(this);
    return removed;
}

function onChildrenBound() {
    this.model.set([]);
    this._connector = milo.minder(this.model, '<<<->>>', this.data);
}


function _sendChangeMessage() {
    this.data.getMessageSource().dispatchMessage(LIST_CHANGE_MESSAGE);
}


var ITEM_PATH_REGEX = /^\[([0-9]+)\]$/;
function onItemsChange(msg, data) {
    var self = this;
    if (data.type == 'added' && ITEM_PATH_REGEX.test(data.path)) {
        this._connector.once('changecompleted', function() {
            var index = +data.path.match(ITEM_PATH_REGEX)[1];
            var newItem = self.list.item(index);

            var btn = newItem.container.scope[DELETE_BUTTON_NAME];
            btn.events.on('click',
                { subscriber: deleteItem, context: newItem });
            _sendChangeMessage.call(self);

            function deleteItem(msg, data) {
                btn.events.off('click',
                    { subscriber: deleteItem, context: this });
                var index = this.data.getKey();
                self.model.splice(index, 1);
                _sendChangeMessage.call(self);
            }
        });
    }
}
