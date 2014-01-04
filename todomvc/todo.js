'use strict';

milo(function() {
    var scope = milo.binder();

    // components
    var todos = scope.todos
        , newTodo = scope.newTodo
        , addBtn = scope.addBtn
        , modelView = scope.modelView;

    // model
    var m = new milo.Model;

    // connect model to list of todos
    milo.minder(m, '<<<->>>', todos.data);

    m.on(/.*/, function(path, data) {
        modelView.data.set(JSON.stringify(m.get()));
    });

    // m.on('[*].checked', function(path, data) {
    //     var matches = path.match(/^\[([0-9]+)\]/);
    //     if (matches) {
    //         var itemID = matches[1];
    //         var item = todos.list.item(itemID);
    //         item.el.classList.toggle('todo-item-checked');
    //     }
    // });

    addBtn.events.on('click', addTodo);

    function addTodo() {
        var itemData = { text: newTodo.data.get() };
        var itemID = m.push(itemData) - 1; // push returns new length, as Array push does
        newTodo.data.set(' '); // can't set to empty string for some reason, only sets to space once
        
        var newItem = todos.list.item(itemID); // item is already shown, we just need to get hold of it
        var itemScope = newItem.container.scope; // get scope inside item

        itemScope.checked.data.on('', {
            subscriber: checkTodo,
            context: newItem
        });

        itemScope.deleteBtn.events.on('click', {
            subscriber: _.partial(removeTodo, itemID),
            context: newItem
        });

        // newItem.data.on('*', function(path, data) {
        //     console.log('newItem data event', path, data);
        // });
        // itemScope.text.data.on('', function(path, data) {
        //     console.log('newItem data event', path, data);
        // });
    }

    function checkTodo(path, data) {
        this.el.classList.toggle('todo-item-checked');
    }

    function removeTodo(id, eventType, event) {
        // m.splice(id, 1); // - probably the best option
        // or
        // m.removeItem(id);
        // NOT:
        // m.remove(id);
        // as this should be implemented to simply remove the property
        this.dom.hide(); // hack, should remove and work without it
        m('[$1]', id).set(undefined); // hack, remove/splice is needed for both Model and Data facet
        // either setting to undefined should delete
        // or splice method is needed with splice data message
    }

    // this method is not needed as model is updated automatically
    //
    // function editTodo(id, eventType, event) {
        // var todoText = this.owner;
        
        //this doesn't work
        // var todo = milo.Component.getContainingComponent(todoText.el, false);
        // var todo = milo.Component.getContainingComponent(todoText.el.parentNode, true);
        
        //Keep the model up to date.
        //We should be adding the data to the model, but that is not possible
        //at the moment because we cant use minder on the list facet. - why can't we?
        // m('[$1].text', id).set(todoText.data.get());
    // }
});
