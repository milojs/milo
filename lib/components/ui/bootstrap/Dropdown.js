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
    destroy: MLDropdown$destroy
});


function MLDropdown$start() {
    var toggleEl = this.el.querySelector('.' + TOGGLE_CSS_CLASS)
        , menuEl = this.el.querySelector('.' + MENU_CSS_CLASS);

    if (! (toggleEl && menuEl))
        return logger.error('MLDropdown:', TOGGLE_CSS_CLASS, 'or', MENU_CSS_CLASS, 'isn\'t found');

    var clickHandler = _toggleMenu.bind(this, undefined);

    this._dropdown = {
        toggle: toggleEl,
        menu: menuEl,
        clickHandler: clickHandler,
        visible: false
    }
    _hideMenu.call(this);
    toggleEl.addEventListener('click', clickHandler);
}


function MLDropdown$destroy() {
    var dd = this._dropdown;
    dd.toggle.removeEventListener('click', dd.clickHandler);
    delete this._dropdown;
    Component.prototype.destroy.apply(this, arguments);
}


function _showMenu() {
    _toggleMenu.call(this, true);
}


function _hideMenu() {
    _toggleMenu.call(this, false);
}


function _toggleMenu(doShow) {
    doShow = typeof doShow == 'undefined'
                ? ! this._dropdown.visible
                : !! doShow;

    this._dropdown.visible = doShow;

    var menu = this._dropdown.menu;
    menu.style.display = doShow
                            ? 'block'
                            : 'none';
}
