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

    var storedModelDataStr = window.localStorage.getItem('todos-milo');
    if (storedModelDataStr)
        var storedModelData = milo.util.jsonParse(storedModelDataStr);

    var m = new milo.Model;

    // connect model to list of todos
    milo.minder(m, '<<<->>>', todos.data);
    m.on('[*]', onItemAdded);
    m.on('[*].completed', onCompleteTodo);
    m.on('**', function showModel(msg, data) {
        var modelDataStr = JSON.stringify(m.get());
        modelView.data.set(modelDataStr);
        window.localStorage.setItem('todos-milo', modelDataStr);
    });
    // set model
    m.set(storedModelData || []);
    showCounters();

    newTodo.events.on('keypress', onKeyPressed);
    toggleAll.data.on('', onToggleAll);
    clearCompletedBtn.events.on('click', onClearCompleted);

    function onKeyPressed(eventType, event) {
        if (event.keyCode == 13) addTodo();
    }

    function onToggleAll(msg, data) {
        var count = m('.length').get();
        for (var i = 0; i < count; i++)
            m('[$1].completed', i).set(data.newValue);
    }

    function onClearCompleted() {
        var i = 0, len = m('.length').get();
        while (i < len)
            if (m('[$1].completed', i).get()) {
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
    }

    function onItemAdded(msg, data) {
        _.defer(function() {
            console.log('onItemAdded', msg, data);
            if (data.type != 'added') return;
            var item = itemForPath(data.path);
            if (item) connectDeleteButton(item);
            showCounters();
        });
    }

    function connectDeleteButton(item) {
        var scope = item.container.scope; // get scope inside item
        scope.deleteBtn.events.on('click', { context: item, subscriber: removeTodo });
    }

    function onCompleteTodo(msg, data) {
        _.defer(function() {
            console.log('onCompleteTodo', msg, data);
            var item = itemForPath(data.path);
            if (item)
                item.el.classList.toggle('completed', data.newValue);
            showCounters();
        });
    }

    function itemForPath(path) {
        var id = +path.replace(/^\[([0-9]*)\].*$/, '$1');
        return todos.list.item(id);
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
                return memo + (item.completed ? 0 : 1);
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
