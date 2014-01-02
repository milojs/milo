milo(function() {
    var scope = milo.binder();

    // components
    var todos = scope.todos
        , newTodo = scope.newTodo
        , addBtn = scope.addBtn;

    // model
    var m = new milo.Model;

    // connect model to list of todos
    milo.minder(m, '<<<->>>', todos.data);

    m.on(/.*/, function(path, data) {
        console.log('changed', m.get());
    });

    addBtn.events.on('click', addTodo);

    // todos.data.on('**', function(path, data) {
    //     console.log('todos data event', path, data);
    // });

    function addTodo() {
        m.push({ text: newTodo.data.get() });
        newTodo.data.set(' '); // can't set to empty string for some reason, only sets to space once
        var itemID = m.get().length - 1;
        var newItem = todos.list.item(itemID);
        var itemScope = newItem.container.scope;
        itemScope.deleteBtn.events.on('click', _.partial(removeTodo, itemID));

        // newItem.data.on('*', function(path, data) {
        //     console.log('newItem data event', path, data);
        // });
        // itemScope.text.data.on('', function(path, data) {
        //     console.log('newItem data event', path, data);
        // });

        // should update model without the following line, but it doesn't
        itemScope.text.events.on('input', _.partial(editTodo, itemID));
    }

    function removeTodo(id, eventType, event) {
        m('[$1]', id).set(undefined);
        todos.list.item(id).dom.hide(); // hack, should remove and work without it
        // either setting to undefined should delete
        // or splice method is needed with splice data message
    }

    function editTodo(id, eventType, event) {
        var todoText = this.owner;
        
        //this doesn't work
        // var todo = milo.Component.getContainingComponent(todoText.el, false);
        // var todo = milo.Component.getContainingComponent(todoText.el.parentNode, true);
        
        //Keep the model up to date.
        //We should be adding the data to the model, but that is not possible
        //at the moment because we cant use minder on the list facet. - why can't we?
        m('[$1].text', id).set(todoText.data.get());
    }
});
