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
    this._removedComponents._each(function(comp) {
        comp.destroy();
    });
    Command.prototype.destroy.apply(this, arguments);
}


function deleteCmdFunc(selectEndContainer) {
    var cmd = Command.getCurrentCommand(deleteCmdFunc);

    this.restoreSelection();

    var selPoint = this._getPostDeleteSelectionPoint(selectEndContainer);

    // extract range. fragment will contain all components that are completely removed
    var range = this.getRange()
        , clonedRange = range.cloneRange();
    var deletedFragment = range.extractContents();
    this.range = clonedRange;

    this._selectAfterDelete(selPoint);

    // detach scopes of removed components by iterating common container component
    var parentEl = this.containingElement()
        , parent = Component.getContainingComponent(parentEl, true, 'container');

    var removedComponents = new Scope;
    parent.container.scope._each(function(child) {
        if (! parentEl.contains(child.el)) {
            child.remove();
            removedComponents._add(child);
        }
    });

    // keep references of those detached components for future 'destroy' of command
    this._removedComponents = removedComponents;

    // create undo command
    var undoCmd = new Command(this, undoDeleteCmdFunc, deletedFragment, parent, removedComponents);
    cmd.setUndo(undoCmd);
}


function undoDeleteCmdFunc(deletedFragment, parent, removedComponents) {
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
     
    // connect scopes - add components to parent
    parent.container.scope._merge(removedComponents);

    // merge elements in the beginning and in the end
}
