'use strict';

var Component = require('../../c_class')
    , componentsRegistry = require('../../c_registry')
    , _ = require('mol-proto')
    , logger = require('../../../util/logger');


var TOGGLE_CSS_CLASS = 'dropdown-toggle'
    , MENU_CSS_CLASS = 'dropdown-menu';


var MLDropdown = Component.createComponentClass('MLDropdown', {
    events: undefined,
    dom: {
        cls: ['ml-bs-dropdown', 'dropdown']
    }
});

componentsRegistry.add(MLDropdown);

module.exports = MLDropdown;


_.extendProto(MLDropdown, {
    start: MLDropdown$start,
    destroy: MLDropdown$destroy,
    toggleMenu: MLDropdown$toggleMenu,
    showMenu: MLDropdown$showMenu,
    hideMenu: MLDropdown$hideMenu
});


function MLDropdown$start() {
    var toggleEl = this.el.querySelector('.' + TOGGLE_CSS_CLASS)
        , menuEl = this.el.querySelector('.' + MENU_CSS_CLASS);

    if (! (toggleEl && menuEl))
        return logger.error('MLDropdown:', TOGGLE_CSS_CLASS, 'or', MENU_CSS_CLASS, 'isn\'t found');

    var doc = window.document
        , clickHandler = this.toggleMenu.bind(this, undefined)
        , docClickHandler = _onClick.bind(this)
        , docOutHandler = _onDocOut.bind(this, 'click', docClickHandler);

    this._dropdown = {
        menu: menuEl,
        visible: false,
        eventsHandlers: []
    };
    this.hideMenu();

    _addHandler.call(this, toggleEl, 'click', clickHandler);
    //maybe only add this events if is open?
    _addHandler.call(this, doc, 'mouseout', docOutHandler);
    _addHandler.call(this, doc, 'click', docClickHandler);
}

function _addHandler(target, eventType, handler) {
    var events = this._dropdown.eventsHandlers;
    events.push({target: target, type: eventType, handler: handler});
    target.addEventListener(eventType, handler);
}

function _removeHandler(target, eventType, handler) {
    var dd = this._dropdown;
    var idx = _.findIndex(dd.eventsHandlers, function(item) {
        return item.target == target && item.handler == handler && item.type == eventType;
    });

    if (idx > -1) {
        dd.eventsHandlers.splice(idx, 1);
        target.removeEventListener(eventType, handler);
    }
}

function _onDocOut(eventType, handler, event) {
    var target = event.target,
        relatedTarget = event.relatedTarget;

    if (isIframe(target))
        _removeHandler.call(this, target.contentWindow.document, eventType, handler);

    if (isIframe(relatedTarget))
        _addHandler.call(this, relatedTarget.contentWindow.document, eventType, handler)
}

function isIframe(el) {
    return el && el.tagName == 'IFRAME';
}


function _onClick(event) {

    var domOwner = this.el;
    
    if (event && event.target)
        var node = domParents(event.target.parentNode, function (node) {
            return node == domOwner;
        });

    if (event && !node)
        this.hideMenu();
}


function domParents(node, validation) {
    while (node) {
        if (validation(node))
            return node;
        node = node.parentNode;
    }
}


function MLDropdown$destroy() {
    var dd = this._dropdown;
    dd.eventsHandlers.forEach(function (eHandler) {
        eHandler.target.removeEventListener(eHandler.type, eHandler.handler);
    });
    delete this._dropdown;
    Component.prototype.destroy.apply(this, arguments);
}


function MLDropdown$showMenu() {
    this.toggleMenu(true);
}


function MLDropdown$hideMenu() {
    this.toggleMenu(false);
}


function MLDropdown$toggleMenu(doShow) {
    doShow = typeof doShow == 'undefined'
                ? ! this._dropdown.visible
                : !! doShow;

    this._dropdown.visible = doShow;

    var menu = this._dropdown.menu;
    menu.style.display = doShow
                            ? 'block'
                            : 'none';
}
