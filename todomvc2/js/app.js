'use strict';

milo(function() {
    var scope = milo.binder();

    // components
    var todos = scope.todos
        , newTodo = scope.newTodo
        , toggleAll = scope.toggleAll
        , clearCompletedBtn = scope.clearCompletedBtn
        , activeCounter = scope.activeCounter
        , completedCounter = scope.completedCounter
        , footer = scope.footer
        , modelView = scope.modelView;

    // model
    var m = new milo.Model([]);

    showCounters();

    // connect model to list of todos
    milo.minder(m, '<<<->>>', todos.data);

    m.on(/.*/, function showModel(msg, data) {
        modelView.data.set(JSON.stringify(m.get()));
    });

    m.on('[*].checked', onCompleteTodo);

    newTodo.events.on('keypress', onKeyPressed);
    toggleAll.data.on('', onToggleAll);
    clearCompletedBtn.events.on('click', onClearCompleted);

    function onKeyPressed(eventType, event) {
        if (event.keyCode == 13) addTodo();
    }

    function onToggleAll(msg, data) {
        var count = m('.length').get();
        for (var i = 0; i < count; i++)
            m('[$1].checked', i).set(data.newValue);
    }

    function onClearCompleted() {
        var i = 0, len = m('.length').get();
        while (i < len)
            if (m('[$1].checked', i).get()) {
                m.splice(i, 1);
                len--;
            } else
                i++;
        showCounters();
    }

    function addTodo() {
        var title = newTodo.data.get().trim();
        if (! title) return;
        var itemData = { title: title };
        var newCount = m.push(itemData);
        var id = newCount - 1; // push returns new length, as Array push does
        newTodo.data.set('');
        showCounters();
        
        _.defer(function() {
            var newItem = todos.list.item(id); // item is already shown, we just need to get hold of it
            var scope = newItem.container.scope; // get scope inside item
            scope.deleteBtn.events.on('click', { context: newItem, subscriber: removeTodo });
        });
    }

    function onCompleteTodo(msg, data) {
        var id = +data.path.replace(/^\[([0-9]*)\].*$/, '$1');
        var item = todos.list.item(id);
        item.el.classList.toggle('completed', data.newValue);
        showCounters();
    }

    function removeTodo(eventType, event) {
        var id = this.data.getKey();
        m.splice(id, 1);
        showCounters();
    }

    function showCounters() {
        var list = m.get()
            , totalCount = list.length
            , activeCount = list.reduce(function(memo, item) {
                return memo + (item.checked ? 0 : 1);
            }, 0)
            , completedCount = totalCount - activeCount;

        var countView = activeCount + (activeCount == 1 ? ' item' : ' items') + ' left';
        activeCounter.data.set(countView);
        completedCounter.data.set(completedCount);
        footer.dom.toggle(totalCount);
        clearCompletedBtn.dom.toggle(completedCount);

        toggleAll.data.off('', onToggleAll);
        toggleAll.data.set(completedCount && completedCount == totalCount);
        toggleAll.data.on('', onToggleAll);
    }
});
