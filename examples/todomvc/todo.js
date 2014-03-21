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

    m.on(/.*/, function showModel(msg, data) {
        modelView.data.set(JSON.stringify(m.get()));
    });


    addBtn.events.on('click', addTodo);

    function addTodo() {
        var itemData = { text: newTodo.data.get() };
        var itemID = m.push(itemData) - 1; // push returns new length, as Array push does
        newTodo.data.set('');
        
        _.defer(function() {
            var newItem = todos.list.item(itemID); // item is already shown, we just need to get hold of it
            var scope = newItem.container.scope; // get scope inside item

            scope.checked.data.on('', { context: newItem, subscriber: checkTodo });
            scope.deleteBtn.events.on('click', { context: newItem, subscriber: removeTodo });
        });
    }

    function checkTodo(path, data) {
        this.el.classList.toggle('todo-item-checked', data.newValue);
    }

    function removeTodo(eventType, event) {
        var id = this.data.getKey();
        m.splice(id, 1);
    }
});
