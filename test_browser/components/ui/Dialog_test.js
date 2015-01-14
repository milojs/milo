'use strict';


var assert = require('assert')
    , MLDialog = milo.registry.components.get('MLDialog');

var options = {
    title: 'Test',
    html: '<div><button ml-bind="[events]:button">Click me</button></div>',
    buttons: [
        { type: 'default', label: 'Cancel', name: 'cancel' },
        { type: 'primary', label: 'Ok', result: 'ok', name: 'ok' }
    ]
};


describe('Dialog', function() {
    it('should have createDialog class method', function() {
        var dialog = MLDialog.createDialog(options);
        assert(dialog instanceof MLDialog);
        var button = dialog.container.path('.dialogBody.button');
        assert(button instanceof milo.Component);
        dialog.destroy();
    });
});