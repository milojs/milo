'use strict';

var Component = require('../../c_class')
    , componentsRegistry = require('../../c_registry')
    , componentName = require('../../../util/component_name')
    , logger = require('../../../util/logger');


var DEFAULT_BUTTONS = [];


var MLDialog = Component.createComponentClass('MLDialog', {
    container: undefined,
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
                        <button ml-bind="[events]:closeBtn" type="button" class="close">&times;</button>\
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
    toggleDialog: MLDialog$toggleDialog
});


function MLDialog$$createDialog(options) {
    var dialog = MLDialog.createOnElement();

    options = _prepareOptions(options);
    dialog._dialog = {
        options: options,
        visible: false
    }

    dialog.template
        .render(options)
        .binder();

    var closeSubscriber = { subscriber: dialog.closeDialog, context: dialog };
    dialog.events.on('click',
        { subscriber: _backdropClick, context: dialog });
    var dialogScope = dialog.container.scope;
    dialogScope.closeBtn.events.on('click',
        { subscriber: dialog.closeDialog, context: dialog });

    options.buttons.forEach(function(btn) {
        var buttonSubscriber = {
            subscriber: _.partial(_dialogButtonClick, btn),
            context: dialog
        };
        dialogScope[btn.name].events.on('click', buttonSubscriber);
    });

    return dialog;
}


function _dialogButtonClick(button) {
    if (button.action == 'close')
        this.closeDialog();
}


function _backdropClick(eventType, event) {
    if (event.target == this.el)
        this.closeDialog();
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


function MLDialog$toggleDialog(doShow) {
    doShow = typeof doShow == 'undefined'
                ? ! this._dialog.visible
                : !! doShow;

    var addRemove = doShow ? 'add' : 'remove'
        , appendRemove = doShow ? 'appendChild' : 'removeChild';

    this._dialog.visible = doShow;

    if (doShow && ! backdropEl)
        _createBackdrop();

    document.body[appendRemove](this.el);
    if (backdropEl)
        document.body[appendRemove](backdropEl);
    this.dom.toggle(doShow);
    this.el.setAttribute('aria-hidden', !doShow);
    document.body.classList[addRemove]('modal-open');
    this.el.classList[addRemove]('in');
}


var backdropEl;
function _createBackdrop() {
    backdropEl = document.createElement('div');
    backdropEl.className = 'modal-backdrop fade in';
}


var openedDialog;
function MLDialog$openDialog() {
    if (openedDialog)
        return logger.warn('MLDialog openDialog: can\'t open dialog, another dialog is already open');

    openedDialog = this;
    this.toggleDialog(true);
}


function MLDialog$closeDialog() {
    if (! openedDialog)
        return logger.warn('MLDialog closeDialog: can\'t close dialog, no dialog open');

    openedDialog = undefined;
    this.toggleDialog(false);
}
