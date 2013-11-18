;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('proto');

function bndr() {};
module.exports = bndr;

var opts = {
	BNDR_ATTR: 'ml-bind'
}

// bind document or section for binding attributes
bndr.bind = function(scopeEl) {
	return new bndr.View(scopeEl);
};

bndr.config = function(options) {
	opts.extend(options);
};

var _components = {};
bndr.registerComponentClass = function(componentClass, name) {
	name = name || componentClass.name;
	validateComponentClass(componentClass, name);
	_components[name] = componentClass;

	function validateComponentClass(componentClass, name) {
		if (typeof componentClass != 'function')
			throw new TypeError('component class must be function');
		validateName(name, 'empty component class name')
		if (_components[name])
			throw new TypeError('component is already registered');
	}
};

bndr.unregisterComponentClass = function(name) {
	validateComponentName(name);
	delete _components[name];

	function validateComponentClass(componentClass, name) {
		validateName(name, 'empty component class name')
		if (! _components[name])
			throw new TypeError('component is not registered');
	}	
};

bndr.getComponentClass = function(name) {
	validateName(name, 'empty component class name')
	return _components[name];
}

function validateName(name, message) {
	if (! name)
		throw new TypeError(message);
}

// collection of components bound to DOM
bndr.View = function(el) {
	Object.defineProperty(this, 'el', {
		enumerable: false,
		value: el
	});
	this.bind(el);
}

bndr.View.extendProto({
	bind: function(scopeEl) {
		var elements = scopeEl.querySelectorAll('[' + opts.BNDR_ATTR + ']')
			, view = this;
		console.log(elements);
		Array.prototype.forEach.call(elements, function(el) {
			var attr = parseBindAttribute(el);
			validateBindAttr(view, attr);
			view[attr.name] = new _components[attr.cls](view, el);

			function parseBindAttribute(el) {
				var attr = el.getAttribute(opts.BNDR_ATTR)
					, bindTo = attr.split(':');
				switch (bindTo.length) {
					case 1:
						return {
							name: bindTo[0],
							cls: 'Component'
						};
					case 2:
						return {
							name: bindTo[1],
							cls: bindTo[0]
						};
					default:
						throw new BindError('invalid bind attribute ' + attr);
				}
			}

			function validateBindAttr(view, attr) {
				validateName(name, 'empty component name')
				if (! attr.name)
					throw new BindError('empty component name');
				if (view[attr.name])
					throw new BindError('duplicate component name ' + attr.name);
				if (! attr.cls)
					throw new BindError('empty component class name');
				if (! _components[attr.cls])
					throw new BindError('unknown component class name ' + attr.cls);
			}
		});
	}
});


bndr.Component = function Component(element) {

}

bndr.registerComponentClass(bndr.Component);

window.bndr = bndr;


},{"proto":2}],2:[function(require,module,exports){
function extendProto(methods) {
	var props = {};
	for (var name in methods)
		props[name] = {
			enumerable: false,
			configurable: false,
			writable: false,
			value: methods[name]
		};
	Object.defineProperties(this.prototype, props);
	return this;
}

function extend(obj) {
	for (var prop in obj)
		this[prop] = obj[prop];
	return this;
}

extendProto.call(Function, {
	extendProto: extendProto,
	extend: extend
});

},{}]},{},[1,2])
;