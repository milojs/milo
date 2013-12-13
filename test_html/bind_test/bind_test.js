'use strict';
// won't work in node - only in browser

describe('milo binder', function() {
    it('should bind components based on ml-bind attribute', function() {
		expect({p: 1}).property('p', 1);

        console.log(milo.binder.scan());

        console.log('one pass binding');
    	var ctrl1 = milo.binder();
        console.log(ctrl1);

        console.log('two pass binding');
        var ctrl = milo.binder.twoPass();
        console.log(ctrl);

    	ctrl.articleButton.events.on('click mouseenter', function(eType, evt) {
    		console.log('button', eType, evt);
    	});

        ctrl.main.events.on('click mouseenter input keypress', function(eType, evt) {
            console.log('div', eType, evt);
        });

    	ctrl.articleIdInput.data.on('datachanged', logData);

    	function logData(message, data) {
    		console.log(message, data);
    	}

        var myTmplComps = ctrl.myTemplate.template
                .set('<p ml-bind=":innerPara">I am rendered from template</p>')
                .render()
                .binder();

        var innerPara = ctrl.myTemplate.container.scope.innerPara;
        innerPara.el.innerHTML += ', then bound and changed via component inside template';

        var myList = ctrl.myList;
        var listArray = [
            {text: 'para 1'},
            {text: 'para 2'},
            {text: 'para 3'},
            {text: 'para 4'},
            {text: 'para 5'}
        ];

        setTimeout(function(){
            myList.list.m('.list').set(listArray);
        }, 1000);
        console.log('myList', myList);
    });
});
