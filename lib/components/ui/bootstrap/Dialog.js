'use strict';

var Component = require('../../c_class')
    , componentsRegistry = require('../../c_registry')
    , componentName = require('../../../util/component_name');


var DEFAULT_BUTTONS = [];


var MLDialog = Component.createComponentClass('MLDialog', {
    events: undefined,
    dom: {
        cls: ['ml-bs-dialog', 'modal', 'fade'],
        attributes: {
            'role': 'dialog',
            'aria-hidden': 'true'
        }
    },
    template: {
        template: '\
            <div class="modal-dialog">\
                <div class="modal-content">\
                    <div class="modal-header">\
                        <button type="button" class="close">&times;</button>\
                        <h4 class="modal-title">{{= it.title }}</h4>\
                    </div>\
                    <div class="modal-body">\
                        {{? it.html }}\
                            {{= it.html }}\
                        {{??}}\
                            <p>{{= it.text }}</p>\
                        {{?}}\
                    </div>\
                    <div class="modal-footer">\
                        {{~ it.buttons :btn }}\
                            <button type="button"\
                                class="btn btn-{{= btn.type }}"\
                                ml-bind="[events]:{{= btn.name }}">{{= btn.label }}</button>\
                        {{~}}\
                    </div>\
                </div>\
            </div>'
    }
});

componentsRegistry.add(MLDialog);

module.exports = MLDialog;


_.extend(MLDialog, {
    createDialog: MLDialog$$createDialog,
    openDialog: MLDialog$$openDialog
});


_.extendProto(MLDialog, {
    openDialog: MLDialog$openDialog,
    closeDialog: MLDialog$closeDialog,
});


function MLDialog$$createDialog(options) {
    var dialog = MLDialog.createOnElement();

    options = _prepareOptions(options);
    this._options = options;

    dialog.template
        .render(options)
        .binder();

    // options.buttons.forEach(function(btn) {
    //     btn.events.on('click', btn.subscriber);
    // });

    return dialog;
}


function _prepareOptions(options) {
    options = _.clone(options);
    options.buttons = _.clone(options.buttons || DEFAULT_BUTTONS);
    options.buttons.forEach(function(btn) {
        if (! btn.name)
            btn.name = componentName();
    });
    return options;
}


/**
 * Create and show dialog popup
 * @param {Object} options object with title, text and buttons
 */
function MLDialog$$openDialog(options) {
    var dialog = MLDialog.createDialog(options);
    dialog.openDialog();
    return dialog;
}


function MLDialog$openDialog() {
    document.body.appendChild(this.el);
    this.dom.show();
    this.owner.el.setAttribute('area-hidden', false);
    document.body.classList.add('modal-open');
    this.el.classList.add('in');
}


function MLDialog$closeDialog() {
    document.body.classList.remove('modal-open');
    this.el.classList.remove('in');
    this.dom.hide();
    this.owner.el.setAttribute('area-hidden', true);
    document.body.removeChild(this.el);
}
