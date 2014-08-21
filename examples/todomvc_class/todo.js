'use strict';

milo(function() {
    // Define Todo Class
    // Can't create a simple class with item facet.
    //var Todo = milo.Component.createComponentClass('Todo', ['list']);
    var Todo = milo.Component.createComponentClass('Todo', ['container']);
    milo.registry.components.add(Todo);

    _.extendProto(Todo, { init: Todo$init });

    function Todo$init() {
        milo.Component.prototype.init.apply(this, arguments);
        this.on('childrenbound', function() {
            var scope = this.container.scope; // get scope inside item
            scope.checked.data.on('', { context: this, subscriber: checkTodo });
            scope.deleteBtn.events.on('click', { context: this, subscriber: removeTodo });
        });

        function checkTodo(path, data) {
            this.el.classList.toggle('todo-item-checked', data.newValue);
        }

        function removeTodo(eventType, event) {
            //should item remove use data facet, because it doesn't now.
            //m.splice(this.item.index, 1);
            this.item.removeItem(true);
        }
    }

    // Begin
    var scope = milo.binder();

    // components
    var todos = scope.todos
        , newTodo = scope.newTodo
        , addBtn = scope.addBtn
        , modelView = scope.modelView;

    // model
    var m = new milo.Model;
    m.on(/.*/, function showModel(msg, data) {
        modelView.data.set(JSON.stringify(m.get()));
    });

    // connect model to list of todos
    milo.minder(m, '<<<->>>', todos.data);

    addBtn.events.on('click', addTodo);

    function addTodo() {
        var itemData = { text: newTodo.data.get() };
        m.push(itemData);
        newTodo.data.set('');
    }
});
