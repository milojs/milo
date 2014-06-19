'use strict';

var Component = require('../../c_class')
    , componentsRegistry = require('../../c_registry')
    , _ = require('mol-proto');


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
    hideMenu: MLDropdown$hideMenu,
});


function MLDropdown$start() {
    var toggleEl = this.el.querySelector('.' + TOGGLE_CSS_CLASS)
        , menuEl = this.el.querySelector('.' + MENU_CSS_CLASS);

    if (! (toggleEl && menuEl))
        return logger.error('MLDropdown:', TOGGLE_CSS_CLASS, 'or', MENU_CSS_CLASS, 'isn\'t found');

    var clickHandler = this.toggleMenu.bind(this, undefined)
        , docClickHandler = _onClick.bind(this);

    this._dropdown = {
        toggle: toggleEl,
        menu: menuEl,
        clickHandler: clickHandler,
        docClickHandler: docClickHandler,
        visible: false
    };
    this.hideMenu();
    toggleEl.addEventListener('click', clickHandler);
    window.document.addEventListener('click', docClickHandler);
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
    dd.toggle.removeEventListener('click', dd.clickHandler);
    window.document.removeEventListener('click', dd.docClickHandler);
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
