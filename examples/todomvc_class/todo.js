'use strict';

// Creating a new facetted component class with the `item` facet.
// This would usually be defined in it's own file.
// Note: The item facet will `require` in 
// the `container`, `data` and `dom` facets
var Todo = milo.Component.createComponentClass('Todo', ['container', 'dom', 'data']);
milo.registry.components.add(Todo);

// Adding our own custom init method
_.extendProto(Todo, { init: Todo$init });

function Todo$init() {
    // Calling the inherited init method.
    milo.Component.prototype.init.apply(this, arguments);
    
    // Listening for `childrenbound` which is fired after binder
    // has finished with all children of this component.
    this.on('childrenbound', function() {
        // We get the scope (the child components live here)
        var scope = this.container.scope;

        // And setup two subscriptions, one to the data of the checkbox
        // The subscription syntax allows for context to be passed
        scope.checked.data.on('', { context: this, subscriber: checkTodo });

        // and one to the delete button's `click` event.
        scope.deleteBtn.events.on('click', { context: this, subscriber: removeTodo });
    });

    // When checkbox changes, we'll set the class of the Todo accordingly
    function checkTodo(path, data) {
        this.el.classList.toggle('todo-item-checked', data.newValue);
    }

    // To remove the item, we use the `removeItem` method of the `item` facet
    function removeTodo(eventType, event) {
        this.item.removeItem();
    }
}


// Milo ready function, works like jQuery's ready function.
milo(function() {

    // Call binder on the document.
    var scope = milo.binder();

    // Get access to our components via the scope object
    var todos = scope.todos // Todos list
        , newTodo = scope.newTodo // New todo input
        , addBtn = scope.addBtn // Add button
        , modelView = scope.modelView; // Where we print out model

    // Setup our model, this will hold the array of todos
    var m = new milo.Model;

    // This subscription will show us the contents of the
    // model at all times below the todos
    m.on(/.*/, function showModel(msg, data) {
        modelView.data.set(JSON.stringify(m.get()));
    });

    // Create a deep two-way bind between our model and the
    // todos list data facet
    milo.minder(m, '<<<->>>', todos.data);

    // Subscription to click event of add button
    addBtn.events.on('click', addTodo);

    // Click handler of add button
    function addTodo() {
        // We package the `newTodo` input up as an object
        // The property `text` corresponds to the item markup.
        var itemData = { text: newTodo.data.get() };

        // And we push that data into the model.
        m.push(itemData);

        // And finally set the input to blank again.
        newTodo.data.set('');
    }
});
