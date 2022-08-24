# W5 JS Framework (2014-2022)

## Wheel. Reinvented. 5th attempt. 

Just another jQuery-like JavaScript framework with some ordinary tools.

	W5("#id, .class, [prob], etc." || document || customObj)

	.on('eventName, customEventName', callback)

	.fire('eventNameToFire')

	.off('eventNameToRemove')

	.val('new value / innerHTML')

	.css('color: red' || { color: 'blue' })

	.attr('prob', 'value') || .attr({ prop: 'value' })

	.addClass('className') || .removeClass('className') || .hasClass('className')
	
	W5.ajax({ url: 'http://url' }).then(function(response) { alert(JSON.stringify(response)); });
	
	W5('[data-placeholder]').autoempty();

	W5('[data-autoresize]').autoresize();

And so on...

Unfortunately, autotests and full documentation got erased by a virus :(
