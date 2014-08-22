'use strict';

var Todo = milo.Component.createComponentClass('Todo', ['container']);
milo.registry.components.add(Todo);

_.extendProto(Todo, { init: Todo$init });

function Todo$init() {
    milo.Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', function() {
        var scope = this.container.scope;
        scope.checked.data.on('', { context: this, subscriber: checkTodo });
        scope.deleteBtn.events.on('click', { context: this, subscriber: removeTodo });
    });

    function checkTodo(path, data) {
        this.el.classList.toggle('todo-item-checked', data.newValue);
    }

    function removeTodo(eventType, event) {
        this.item.removeItem();
    }
}

milo(function() {
    var scope = milo.binder();

    var todos = scope.todos
        , newTodo = scope.newTodo
        , addBtn = scope.addBtn
        , modelView = scope.modelView;

    var m = new milo.Model;
    m.on(/.*/, function showModel(msg, data) {
        modelView.data.set(JSON.stringify(m.get()));
    });

    milo.minder(m, '<<<->>>', todos.data);

    addBtn.events.on('click', addTodo);

    function addTodo() {
        var itemData = { text: newTodo.data.get() };
        m.push(itemData);
        newTodo.data.set('');
    }
});
