'use strict';


var Command = require('../../command')
    , commandsRegistry = require('../../command/cmd_registry')
    , Component = require('../../components/c_class')
    , Scope = require('../../components/scope')
    , domUtils = require('../dom')
    , _ = require('mol-proto');


var DeleteTextSelectionCommand = _.createSubclass(Command, 'DeleteTextSelectionCommand');


module.exports = DeleteTextSelectionCommand;

commandsRegistry.add(DeleteTextSelectionCommand);


_.extendProto(DeleteTextSelectionCommand, {
    init: DeleteTextSelectionCommand$init,
    destroy: DeleteTextSelectionCommand$destroy
});


function DeleteTextSelectionCommand$init(ts, func, selectEndContainer) {
    func = func || deleteCmdFunc;
    Command.prototype.init.call(this, ts, func, selectEndContainer);
}


function DeleteTextSelectionCommand$destroy() {
    if (this._removedComponents) {
        this._removedComponents.forEach(function(comp) {
            comp.destroy();
        });
    }
    Command.prototype.destroy.apply(this, arguments);
}


function deleteCmdFunc(selectEndContainer) {
    var cmd = Command.getCurrentCommand(deleteCmdFunc);

    this.restoreSelection();

    var selPoint = this._getPostDeleteSelectionPoint(selectEndContainer);

    // detach removed components from their scopes
    if (! this.isCollapsed && this.range) {
        
        var removedComponents = this.containedComponents()
            , detached = [];

        removedComponents.forEach(function(component) {
            var parent = component.getScopeParent();
            if (removedComponents.indexOf(parent) == -1) {
                component.remove();
                detached.push({ parent: parent, component: component });
            }
        });

        // keep references of those detached components for future 'destroy' of command
        this._removedComponents = removedComponents;
    }

    // extract range. fragment will contain all components that are completely removed
    var range = this.getRange()
        , clonedRange = range.cloneRange();

    var deletedFragment = range.extractContents();
    this.range = clonedRange;

    this._selectAfterDelete(selPoint);

    var parentEl = this.containingElement()
        , parent = Component.getContainingComponent(parentEl, true, 'container');

    // create undo command
    var undoCmd = new Command(this, undoDeleteCmdFunc, deletedFragment, parent, detached);
    cmd.setUndo(undoCmd);
}


function undoDeleteCmdFunc(deletedFragment, parent, detached) {
    // find element immediately after deleted fragment
    var selStart = this.range.startContainer;
    var treeWalker = domUtils.createTreeWalker(parent.el);
    treeWalker.currentNode = selStart;
    do {
        var nextNode = treeWalker.nextNode();
    } while (nextNode && nextNode.nodeType != Node.ELEMENT_NODE);

    var parentEl = nextNode && nextNode.parentNode;
    if (! (nextNode && parentEl)) return logger.error('Can\'t undo text selection deletion');

    // insert fragment back
    parentEl.insertBefore(deletedFragment, nextNode);
     
    // connect scopes - add components to their previous parents
    detached && detached.forEach(function(d) {
        d.parent.container.scope._add(d.component);
    });

    // merge elements in the beginning and in the end
}
