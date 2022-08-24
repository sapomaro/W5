/*
W5 JS (2014-2022)
Wheel. Reinvented. 5th attempt. 
Just another jQuery-like JavaScript framework with some ordinary tools.

W5("#id, .class, [prob], etc." || document || customObj)
	.on('eventName, customEventName', callback)
	.fire('eventNameToFire')
	.off('eventNameToRemove')
	.val('new value / innerHTML')
	.css('color: red' || { color: 'blue' })
	.attr('prob', 'value') || .attr({ prop: 'value' })
	.addClass('className') || .removeClass('className') || .hasClass('className')
	
W5.ajax({ url: 'http://url' }).then(function(response) {
	alert(JSON.stringify(response));
});
	
W5('[data-placeholder]').autoempty();
W5('[data-autoresize]').autoresize();

And so on...

Unfortunately, autotests and full documentation got erased by a virus :(
*/

window.W5 = (function() {
	"use strict";
	var Wrapper = function(query) {
		return new getter(query);
	},
	finder = function(query, parent) {
		parent = parent || document;
		switch (typeof query) {
			case 'object':
				var output = [];
				if (query instanceof Node || query === window || query === document) {
					output = [query];
				}
				else if (query instanceof Array) {
					for (var q = 0; q < query.length; ++q) {
						if ('object' === typeof query[q] && query[q].__W) {
							output = output.concat(query[q].nodeList || []);
						}
						else{
							output.push(query[q]);
						}
					}
				}
				else if (query.__W) {
					output = query[q].nodeList || [];
				}
				else if (Object.prototype.toString.call(query) === '[object Window]' 
					|| Object.prototype.toString.call(query) === '[object HTMLDocument]') {
					/* for some edge cases */
					output = [query];
				}
				
				if (parent === document) {
					return output;
				}
				else{
					var output2 = [];
					for (var o in output) {
						if (parent.contains(output[o])) {
							output2.push(output[o]);
						}
					}
					if (output2.length === 0) { output2 = null; }
					return output2;
				}
			break;
			case 'string':
				if (parent.querySelectorAll) {
					var match;
					try{ match = parent.querySelectorAll(query); }
					catch(error) { match = null; }
					if (match !== null) {
						return Array.prototype.slice.call(match);
					}
				}
			break;
		}
		return [];
	},
	getter = function(query) {
		this.__W = true;
		this.nodeList = finder(query) || [];
		this.node = this.nodeList[0] || null;
		for (var n = 0; n < this.nodeList.length; ++n) {
			var callbacks = this.__listeners = this.__listeners || {};
			for (var type in callbacks) {
				for (var id in callbacks[type]) {
					Wrapper(this.nodeList[n]).on(type, callbacks[type][id].callback, { context:this });
				}
			}
		}
		return this;
	};
	getter.prototype = Wrapper.prototype;
	
	Wrapper.prototype.get = getter;
	Wrapper.prototype.each = function(callback) {
		for (var n = 0; n < (this.nodeList || []).length; ++n) { //for (var n = (this.nodeList || []).length; n--; ) {
			//if (this.nodeList[n] === null || 'object' !== typeof this.nodeList[n]) { continue; }
			callback.apply(this, [this.nodeList[n], this.parent]);
		}
		return this;
	};
	Wrapper.prototype.delay = function(callback, ms) {
		var context = this;
		var timer = window.setTimeout(function() {
			try {
				callback.call(context);
			}
			catch(error) {
				error.event = 'delay';
				if (this && this.item) {
					error.target = ((this.item(0) || {}).tagName || '');
				}
				//error.target = (this.tagName || '')+(this.id? '#'+this.id : '')+(this.className? '.'+this.className.split(' ').join('.') : '');
				Wrapper(window).fire('error', error);
			}
		}, ms || 1000);
		return timer;
	};
	Wrapper.prototype.item = function(offset) {
		return (this.nodeList || [])[offset] || null;
	};
	Wrapper.prototype.find = function(query) {
		var output = [];
		this.each(function(item) {
			output = output.concat(finder(query, item));
		});
		if (output.length > 0) {
			output = Wrapper(output);
			output.parent = this;
			return output;
		}
		else{
			return Wrapper();
		}
	};
	Wrapper.prototype.append = function(appendee) {
		var list = [];
		if ('string' === typeof appendee) {
			this.each(function(item) {
				list.push(item.appendChild(document.createElement(appendee)));
			});
		}
		else if ('object' === typeof appendee) {
			this.each(function(item) {
				list.push(item.appendChild(appendee));
			});
		}
		return Wrapper(list);
	};
	
/* event manipulation */
	var callbackId = 1,
	eventX = function eventX() {
		return ~~((((this.changedTouches || this.touches || [])[0] || this).clientX || 0) + (window.scrollX || document.documentElement.scrollLeft || 0));
		/*var x = ((this.changedTouches || this.touches || [])[0] || this).clientX || 0;
		x += (window.scrollX || document.documentElement.scrollLeft || 0); 
		if (local) {
			var node = this.currentTarget || this.eventTarget || this.target;
			do{ if (node) { x -= node.offsetLeft || 0; } }
			while(node = node.parentNode);
		}
		return ~~x;*/
	},
	eventY = function eventY() {
		return ~~((((this.changedTouches || this.touches || [])[0] || this).clientY || 0) + (window.scrollY || document.documentElement.scrollTop || 0));
		/*var y = ((this.changedTouches || this.touches || [])[0] || this).clientY || 0;
		y += (window.scrollY || document.documentElement.scrollTop || 0);
		if (local) {
			var node = this.currentTarget || this.eventTarget || this.target;
			do{ if (node) { y -= node.offsetTop || 0; } }
			while(node = node.parentNode);
		}
		return ~~y;*/
	},
	fastEventHandler = function(stream) {
		var event = stream.type;
		stream.eventTarget = this;
		stream.absX = eventX;
		stream.absY = eventY;
		if ('object' !== typeof this.__listeners) { return null; }
		if ('object' !== typeof this.__listeners[event]) { return null; }
		for (var c in this.__listeners[event]) {
			this.__listeners[event][c].callback.apply(this.__listeners[event][c].context, [stream]);
		}
	},
	eventHandler = function(stream, custom) {
		if ('object' !== typeof stream) {
			stream = {
				type: 'error',
				message: arguments[0],
				file: arguments[1],
				line: arguments[2],
				column: arguments[3],
				object: arguments[4]
			};
		}
		var event = (custom? stream.eventType : stream.type);
		var returnValue = true;
		stream.eventTarget = this;
		stream.absX = eventX;
		stream.absY = eventY;
		var callbacks = (this.__listeners || {})[event] || {};
		for (var c in callbacks) {
			callbacks.count = ++callbacks.count || 1;
			if ('function' === typeof callbacks[c].callback) {
				try{
					returnValue = callbacks[c].callback.apply(callbacks[c].context, [stream]);
				}
				catch(error) {
					error.event = event + '['+c+']';
					if (this === window) { error.target = 'window'; }
					else if (this === document) { error.target = 'document'; }
					else{ error.target = (this.tagName || '') + (this.id? '#' + this.id : '') + (this.className? '.' + this.className.split(' ').join('.') : ''); }
					Wrapper(window).fire('error', error);
				}
			}
		}
		if ('undefined' !== typeof returnValue) {
			return returnValue;
		}
	},
	eventBinder = function(item, event, callback, options) {
		var callbacks = item.__listeners = item.__listeners || {};
		if (!callbacks[event]) {
			callbacks[event] = {};
			if (item['on' + event]) {
				callbacks[event][0] = item['on' + event];
			}
		}
		else if (options.once) { 
			return false; 
		}
		callbacks[event][callback.__id] = {
			callback: callback,
			context: options.context || this
		};
		if ('undefined' !== typeof item['on' + event]) {
			if (event === 'mousemove') {
				item['on' + event] = fastEventHandler;
			}
			else{
				item['on' + event] = eventHandler;
			}
		}
		else if ('undefined' !== typeof item.addEventListener && 'undefined' !== typeof item.removeEventListener) {
			item.removeEventListener(event, eventHandler);
			item.addEventListener(event, eventHandler, false);
		}
	},
	eventRemover = function(item, event, callback, options) {
		if (item.__listeners && item.__listeners[event]) {
			if ('undefined' !== typeof options.id) {
				delete item.__listeners[event][options.id];
			}
			else if (callback) {
				if (callback.__id) {
					delete item.__listeners[event][callback.__id];
				}
			}
			else{
				delete item.__listeners[event];
				if (item['on' + event]) {
					item['on' + event] = null;
				}
				if ('undefined' !== typeof item.removeEventListener) {
					item.removeEventListener(event, eventHandler);
				}
			}
		}
	};
	Wrapper.customEvents = {};
	Wrapper.prototype.on = function(events, callback, options) {
		options = options || {};
		if ('undefined' !== typeof options.id) {
			callback.__id = options.id;
		}
		else if ('undefined' === typeof callback.__id) { 
			callback.__id = ++callbackId;
		}
		if ('string' === typeof events) { 
			events = events.split(/[, ]+/); 
		}
		for (var e in events) {
			this.each(function(item) {
				eventBinder.apply(this, [item, events[e], callback, options]);
			});
			eventBinder.apply(this, [this, events[e], callback, options]);

			if ('function' === typeof Wrapper.customEvents[events[e]]) { // 2017-02-27
				Wrapper.customEvents[events[e]].call(this, events[e]);
			}
		}
		return this;
	};
	Wrapper.prototype.fire = function(events, stream, options) {
		options = options || {};
		if ('string' === typeof events) { 
			events = events.split(/[, ]+/); 
		}
		for (var e in events) {
			if (!stream) { stream = {}; }
			stream.eventType = events[e];
			this.each(function(item) {
				eventHandler.apply(item, [stream, true]);	
			}); 
			if (events[e] === 'now') {
				this.off('now');
			}
		}
		return this;
	};
	Wrapper.prototype.off = function(events, callback, options) {
		options = options || {};
		if (typeof events === 'string') { 
			events = events.split(/[, ]+/); 
		}
		for (var e in events) {
			eventRemover.apply(this, [this, events[e], callback, options]);
			this.each(function(item) {
				eventRemover.apply(this, [item, events[e], callback, options]);
			});
		}
		return this;
	};

	return Wrapper;
})();



/* CORE FUNCTIONS EXTENSIONS */

W5.time = function(micro) {	
	if (micro) {
		return (new Date()).getTime(); 
	}
	else{
		return Math.round((new Date()).getTime()/1000); 
	}
};
W5.date = function(timestamp, delimeter) {
	var dateObj = new Date(parseInt(timestamp)*1000);
	if ('undefined' === typeof delimeter) { delimeter = '.'; }
	var day = dateObj.getUTCDate();
	var month = dateObj.getUTCMonth() + 1;
	var year = dateObj.getUTCFullYear();
    if (day < 10) { day = '0' + day; } 
    if (month < 10) { month = '0' + month; } 
	return day + delimeter + month + delimeter + year;
};
W5.empty = function(obj) {
	if (!obj) { return true; }
	if ('object' === typeof obj) {
		for (var prop in obj) {
			if (obj.hasOwnProperty(prop)) { return false; }
		}
		return true;
	}
	return false;
}
W5.clone = function clone(obj) {
	if (null === obj || 'object' !== typeof obj || obj instanceof Array) { return obj; }
	var result = {};
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop)) { 
			result[prop] = clone(obj[prop]);
		}
	}
	return result;
};
W5.merge = function(obj1, obj2) {
	if (null === obj1 || 'object' !== typeof obj1) { 
		var result = W5.clone(obj2); 
	}
	else{
		var result = W5.clone(obj1); 
		for (var o in obj2) {
			if (null === obj2[o] || 'object' !== typeof obj2[o]) { 
				result[o] = obj2[o];
			}
			else{
				result[o] = W5.merge(obj1[o], obj2[o]);
			}
		}
	}
	return result;
};
W5.shuffle = function(arr) {
	var counter = arr.length, index, temp;
	while(counter > 0) {
		index = Math.floor(Math.random() * counter);
		counter--;
		temp = arr[counter];
		arr[counter] = arr[index];
		arr[index] = temp;
    }
    return arr;
};

/* CUSTOM EVENTS EXTENSIONS */

W5.customEvents.now = function(eventType) { 
	this.fire(eventType); 
};
W5.customEvents.after = function(eventType) { 
	this.delay(function() { this.fire(eventType); }, 25);
};
W5.customEvents.looseclick = function(eventType) { 
	this.on('mousedown', function(stream) {
		if (stream.currentTarget && !stream.currentTarget.disabled) {
			stream.currentTarget.__eventState = 1;
		}
	});
	this.on('mouseout', function(stream) {
		if (stream.currentTarget) {
			stream.currentTarget.__eventState = 0;
		}
	});
	this.on('mouseup', function(stream) {
		if (stream.currentTarget && stream.currentTarget.__eventState) {
			stream.currentTarget.__eventState = 0;
			W5(stream.currentTarget).fire(eventType, stream);
		}
	});
};
W5.customEvents.loosetouch = function(eventType) { 
	this.on('touchstart', function(stream) {
		if (stream.target && !stream.target.disabled) {
			stream.target.__eventState = 1;
		}
	});
	this.on('touchleave', function(stream) {
		if (stream.target) {
			stream.target.__eventState = 0;
		}
	});
	this.on('touchend', function(stream) {
		if (stream.target && stream.target.__eventState) {
			stream.target.__eventState = 0;
			W5(stream.target).fire(eventType, stream);
		}
	});
};
W5.customEvents.longclick = function(eventType) { 
	var longclicktimer;
	this.on('mousedown', function(stream) {
		if (!stream.which || stream.which === 1) {
			longclicktimer = this.delay(function() {
				this.fire(eventType, stream);
			}, 500);
		}
	});
	this.on('mouseup, mouseout', function(stream) {
		if (longclicktimer) { window.clearTimeout(longclicktimer); }
	});
};
W5.customEvents.longtouch = function(eventType) { 
	var longtouchtimer;
	this.on('touchstart', function(stream) {
		if (!stream.which || stream.which === 1) {
			longtouchtimer = this.delay(function() {
				this.fire(eventType, stream);
			}, 500);
		}
	});
	this.on('touchend, touchleave', function(stream) {
		if (longtouchtimer) { window.clearTimeout(longtouchtimer); }
	});
};
W5.customEvents.dbltouch = function(eventType) { 
	this.on('touchstart', function(stream) {
		if (stream.target && stream.touches && stream.touches.length === 1) {
			if (stream.target.__eventDbltouchState) { return false; }
			stream.target.__eventDbltouchState = 1;
			var time1 = W5.time(true);
			var coord1 = [stream.touches[0].clientX, stream.touches[0].clientY];
			var time2 = stream.target.__eventLastTapTime = stream.target.__eventLastTapTime || 0;
			var coord2 = stream.target.__eventLastTapCoord = stream.target.__eventLastTapCoord || [-100,-100];
			if ((time1-time2) > 0 && (time1-time2) < 500 
			  && (coord1[0]-coord2[0]) < 16 && (coord1[0]-coord2[0]) > -16
			  && (coord1[1]-coord2[1]) < 16 && (coord1[1]-coord2[1]) > -16) {
				stream.target.__eventDbltouchTrigger = true;
			}
			stream.target.__eventLastTapTime = time1;
			stream.target.__eventLastTapCoord = coord1;
		}
	});
	this.on('touchend', function(stream) { // touchend
		if (stream.target) {
			stream.target.__eventDbltouchState = 0;
			if (stream.target.__eventDbltouchTrigger) {
				delete stream.target.__eventDbltouchTrigger;
				W5(stream.target).fire(eventType, stream);
			}
		}
	});
};

/* DOM FUNCTIONS EXTENSIONS */

W5.prototype.css = function(styles, options) {
	if (this.css === W5.prototype.css) {
		this.css = this.css.bind(this);
	}
	options = options || {};
	var defaultUnit = 'px';
	var defaultUnitProps = [ // some of them
		'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 
		'margin', 'padding', 
		'top', 'left', 'bottom', 'right',
		'fontSize', 'borderWidth' 
	];
	if ('object' === typeof styles) {
		this.each(function(item) {
			for (var prop in styles) {
				try {
					if (options.reset) {
						this.css[prop] = item.style[prop] = '';
					}
					else{
						if (defaultUnitProps.indexOf(prop) !== -1 && typeof(styles[prop]) === 'number') { 
							styles[prop] += defaultUnit; 
						}
						this.css[prop] = item.style[prop] = styles[prop];
					}
				}
				catch(error) {}
			}
		});
	}
	else if ('string' === typeof styles) {
		// [?] save replace for content:"..." 
		styles = styles.split(/\s*;\s*/);
		for (var s = 0, len = styles.length; s < len; ++s) {
			if (styles[s] === '') { continue; }
			styles[s] = styles[s].split(/\s*:\s*/);
			// property name handling
			styles[s][0] = styles[s][0].toLowerCase().split('-');
			for (var p in styles[s][0]) {
				if (p != 0) {
					styles[s][0][p] = styles[s][0][p].substr(0,1).toUpperCase() + styles[s][0][p].substr(1);
				}
			}
			styles[s][0] = styles[s][0].join('');
			if (styles[s][0] === 'float') { styles[s][0] = 'cssFloat'; }
			this.each(function(item) {
				try{
					if (options.reset) {
						this.css[styles[s][0]] = item.style[styles[s][0]] = '';
					}
					else{
						this.css[styles[s][0]] = item.style[styles[s][0]] = styles[s][1];
					}
				}
				catch(error) {}
			});
		}
	}
	return this;
};
W5.prototype.attr = function(prop, data) {
	var attr = false;
	if ('string' === typeof prop) {
		this.each(function(item) {
			if ('undefined' === typeof data) {
				if (item.hasAttribute(prop)) {
					attr = item.getAttribute(prop);
				}
				else{
					attr = null;
				}
			}
			else if (data === null) {
				item.removeAttribute(prop);
			}
			else{
				item.setAttribute(prop, data);
			}
		});
	}
	else if ('object' === typeof prop) {
		this.each(function(item) {
			for (var name in prop) {
				if (prop[name] === null) {
					item.removeAttribute(name);
				}
				else{
					item.setAttribute(name, prop[name]);
				}
			}
		});
	}
	if (attr === false) { return this; }
	else{ return attr; }
};
W5.prototype.val = function(data) {
	var val;
	this.each(function(item) {
		if (item.tagName && item.tagName === 'SELECT') {
			if ('undefined' === typeof data) { val = item.options[item.selectedIndex].value; }
		}
		else if ('undefined' !== typeof item.value) {
			if ('undefined' === typeof data) { val = item.value; }
			else{ item.value = data; }
		}
		else if ('undefined' !== typeof item.innerHTML) {
			if ('undefined' === typeof data) { val = item.innerHTML; }
			else{ item.innerHTML = data; }
		}
	});
	this.fire('valuechange');
	return ('undefined' === typeof val? this : String(val)); 
};

W5.prototype.selection = function(data) { 
	var sel;
	this.each(function(item) {
		if ('undefined' === typeof data) {
			sel = [item.selectionStart, item.selectionEnd];
		}
		else{
			if (item.setSelectionRange) {
				item.setSelectionRange(data[0], data[1]);
			}
		}
	});
	return ('undefined' === typeof sel? this : sel); 
};
W5.prototype.sel = function(start, end) { // UPD 2018-05-19
	this.each(function(item) {
		if (item.setSelectionRange) {
			item.setSelectionRange(start, end);
		}
	});
	return this; 
};


W5.prototype.addClass = function() {
	var list = Array.prototype.slice.call(arguments);
	for (var l in list) {
		var pattern = new RegExp('(?:^|\\s)' + list[l] + '(?!\\S)', 'gi');
		this.each(function(item) {
			if (item.className.match(pattern) === null) {
				item.className += ' ' + list[l];
				item.className = item.className.replace(/^\s+|\s+$/g, '');
			}
		});
	}
	return this;
};
W5.prototype.removeClass = function() {
	var list = Array.prototype.slice.call(arguments);
	for (var l in list) {
		var pattern = new RegExp('(?:^|\\s)' + list[l] + '(?!\\S)', 'gi');
		this.each(function(item) {
			item.className = item.className.replace(pattern, '').replace(/^\s+|\s+$/g, '');
		});
	}
	return this;
};
W5.prototype.hasClass = function() {
	var result = true, list = Array.prototype.slice.call(arguments);
	for (var l in list) {
		var pattern = new RegExp('(?:^|\\s)' + list[l] + '(?!\\S)', 'gi');
		this.each(function(item) {
			if (!item.className || item.className.match(pattern) === null) {
				result = false;
			}
		}, { proto:true });
	}
	return result;
};



W5.prototype.autoempty = function() {
	this.each(function(item) {
		W5(item).on('now, blur', function() {
			if (document.activeElement !== this.item(0) && this.val() === '') { 
				this.val(this.attr('data-placeholder')); 
			}
		});
		W5(item).on('focus', function() {
			if (this.item(0).value === this.attr('data-placeholder')) { 
				this.val(''); 
			}
		});
	});
};
W5.prototype.autoresize = function() {
	this.each(function(item) {
		W5(item).on('autoresize', function() {
			this.item(0).style.overflowY = 'hidden';
			this.item(0).style.marginTop = this.item(0).scrollHeight + 'px'; 
			this.item(0).style.minHeight = 0; 
			this.item(0).style.minHeight = this.item(0).scrollHeight + 'px'; 
			this.item(0).style.marginTop = 0;
		});
		W5(item).on('now, focus, keyup, mouseup, valuechange', function() {
			//alert(typeof this);
			this.fire('autoresize');
		});
	});
};


/* URL & AJAX EXTENSIONS */

W5.resolve = function resolve(url, base) {
	if ('string' !== typeof url || !url) {
		return null; // wrong or empty url
	}
	//if (url.slice(-1) === '/') { url = url.slice(0, -1); }
	else if (url.match(/^[a-z]+\:\/\//i)) { 
		return url; // url is absolute already 
	}
	else if (url.match(/^\/\//)) { 
		return 'http:' + url; // url is absolute already 
	}
	else if (url.match(/^[a-z]+\:/i)) { 
		return url; // data URI or mailto: or tel:
	}
	else if ('string' !== typeof base) {
		var a = document.createElement('a'); 
		a.href = url; // try to resolve url without base  
		if (!a.pathname) { //!a.hostname || !a.protocol ||  
			return null; // url not valid 
		}
		return 'http://' + url;
	}
	else{ 
		base = resolve(base); // check base
		if (base === null) {
			return null; // wrong base
		}
	}
	var a = document.createElement('a'); 
	a.href = base;
	
	if (url[0] === '/') { 
		base = []; // rooted path
	}
	else{ 
		base = a.pathname.split('/'); // relative path
		base.pop(); 
	}
	url = url.split('/');
	for (var i = 0; i < url.length; ++i) {
        if (url[i] === '.') { // current directory
			continue;
		}
        if (url[i] === '..') { // parent directory
			if ('undefined' === typeof base.pop() || base.length === 0) { 
				continue; // wrong url accessing unexisting parent directories
			}
		}
        else{ // child directory
			base.push(url[i]); 
		}
    }
    return a.protocol + '//' + a.hostname + base.join('/');
}


W5.ajax = function(request) {
	request.context = request.context || this;
	request.then = function(callback) {
		request.then.callbacks = request.then.callbacks || [];
		request.then.callbacks.push(callback.bind(request.context));
		return request;
	};
	request.then.trigger = function() {
		for (var c = 0; c < request.then.callbacks.length; ++c) {
			try{
				request.then.callbacks[c](request);
			}
			catch(error) {
				request.error = error;
				request.catch.trigger();
				break;
			}
		}
		request.finally.trigger();
	};
	request.catch = function(callback) {
		request.catch.callback = callback.bind(request.context);
		return request;
	};
	request.catch.trigger = function() {
		request.catch.callback(request);
		request.finally.trigger();
	};
	request.catch(function() {});
	
	request.finally = function(callback) {
		request.finally.callback = callback.bind(request.context);
		return request;
	};
	request.finally.trigger = function() {
		request.finally.callback(request);
	};
	request.finally(function() {});
	
	if (!request.url) { 
		request.responseError = { url:false };
		return request; 
	}
	request.method = request.method || 'POST';
	request.headers = request.headers || {};
	if ('object' === typeof request.query) {
		request.type = 'JSON';
		request.headers['Content-Type'] = request.headers['Content-Type'] || 'application/json; charset = UTF-8';
		for (var prop in request.query) {
			if ('undefined' === typeof request.query[prop]) {
				delete request.query[prop];
			}
		}
		var query = JSON.stringify(request.query);
	}
	else{
		request.type = 'string';
		request.headers['Content-Type'] = request.headers['Content-Type'] || 'application/x-www-form-urlencoded; charset = UTF-8';
		var query = request.query;
	}
	request.ajax = new XMLHttpRequest();
	request.ajax.open(request.method, request.url, true);
	request.ajax.withCredentials = true;
	request.abort = function(silent) {
		request.silent = silent || false;
		request.ajax.abort();
	};
	//if ('undefined' === typeof request.ajax.request) { request.ajax.request = request; } 
	//if ('undefined' === typeof request.ajax.url) { request.ajax.url = request.url; } 
	if (request.timeout) { request.ajax.timeout = request.timeout; }
	for (var name in request.headers) {
		request.ajax.setRequestHeader(name, request.headers[name]);
	}
	request.ajax.send(query);
	
	request.ajax.onreadystatechange = function() {
		if (request.ajax.readyState === 4) {
			request.responseHeaders = {};
			var hdrs = request.ajax.getAllResponseHeaders();
			var smcn = 0, crlf = 0, hdln = 0;
			while(true) {
				hdln = hdrs.indexOf('\r\n', crlf);
				smcn = hdrs.indexOf(': ', crlf);
				if (hdln === -1 || smcn === -1) { break; }
				request.responseHeaders[hdrs.slice(crlf, smcn)] = hdrs.slice(smcn + 2, hdln);
				crlf = hdln + 2;
			}
			if (request.ajax.status === 200) {
				request.responseText = request.ajax.responseText;
				if (request.type === 'JSON') {
					var response = request.ajax.responseText.replace(/^\"|\"$/g, ''); // \\\"|
					if (response === '') { response = 'null'; }
					try{
						request.response = JSON.parse(response);
					}
					catch(error) {
						request.error = error;
						request.catch.trigger();
						return request;
					}
				}
				request.then.trigger();
			}
			else if (!request.silent) {
				request.error = {};
				if (request.ajax.timeout) { //'undefined' !== typeof 
					request.error.timeout = request.ajax.timeout; 
				}
				if ('undefined' !== typeof request.ajax.status) { 
					request.error.status = request.ajax.status; 
				}
				request.catch.trigger();
			}
		}
	}
	return request;
};

/* DEV EXTENSIONS */

W5.client = {};
W5.client.touchscreen = (('ontouchstart' in window) || ((navigator.MaxTouchPoints || 0) > 0) || ((navigator.msMaxTouchPoints || 0) > 0));
W5.client.devtype = (W5.client.touchscreen? 'portable' : 'desktop');
W5.client.browser = (function() {
	var agent = navigator.userAgent || '', name = '', nameOffset, version, versionOffset;
	var browsers = {
		Opera: 'Opera', 
		MSIE: 'IE',
		Trident: 'IE',
		Edge: 'Edge',
		SamsungBrowser: 'SamsungBrowser',
		Dolfin: 'Dolphin',
		Chrome: 'Chrome',
		Safari: 'Safari',
		Firefox: 'Firefox'
	};
	
	for (var b in browsers) {
		if ((versionOffset = agent.indexOf(b)) !== -1) {
			name = browsers[b];
			version = agent.substring(versionOffset + b.length + 1);
			if ((b === 'Opera' || b === 'Safari') && (versionOffset = agent.indexOf('Version')) !== -1) {
				version = agent.substring(versionOffset + 8);
			}
			else if (b === 'Trident' && (versionOffset = agent.indexOf('rv:')) !== -1) {
				version = agent.substring(versionOffset + 3);
			}
			break;
		}
	}
	if (!name && (nameOffset = agent.lastIndexOf(' ') + 1) < (versionOffset = agent.lastIndexOf('/'))) {
		name = agent.substring(nameOffset, versionOffset);
		version = agent.substring(versionOffset + 1);
	}
	version = parseFloat(version);
	if (!name || name.toLowerCase() == name.toUpperCase()) {
		name = navigator.appName || 'unknown';
	}
	if (!version || isNaN(version)) {
		version = parseFloat(navigator.appVersion) || 0;
	}
	return { name:name, version:version };
})();
W5.client.name = W5.client.browser.name;
W5.client.version = W5.client.browser.version;
W5.client.system = (function() {
	var agent = navigator.userAgent || '', system;
	if (agent.match(/win/i) !== null) { system = 'Windows'; }
	if (agent.match(/windows phone/i) !== null) { system = 'Windows Phone'; }
	if (agent.match(/mac/i) !== null) { system = 'MacOS'; }
	if (agent.match(/ipad|iphone|ipod/i) !== null && !window.MSStream) { system = 'iOS'; }
	if (agent.match(/x11/i) !== null) { system = 'UNIX'; }
	if (agent.match(/linux/i) !== null) { system = 'Linux'; }
	if (agent.match(/android/i) !== null) { system = 'Android'; }
	if (!system) { system = 'unknown'; }
	return system;
})();
W5.client.incompatibility = (function() {
	var items = [
		'document.getElementById', 'document.getElementsByClassName',
		'document.querySelector', 'document.querySelectorAll', 
		'document.createElement', //'document.implementation.createDocument',
		'HTMLDocument', 'Node.prototype', 
		'addEventListener', 'Event.prototype',
		'document.documentElement.scrollTop', 'document.documentElement.scrollLeft', 
		'Math.round', 'Math.max', 'Math.min',
		'Object.prototype.constructor', 'Object.create',
		'String.prototype.split', 'String.prototype.replace',
		'Array.prototype.push', 'Array.prototype.slice', 'Array.prototype.shift',
		'Function.prototype.bind', 'Function.prototype.apply', 'Function.prototype.call', 
		'JSON.stringify', 'JSON.parse',
		'navigator', 'location', 'XMLHttpRequest', 
		'localStorage.setItem', 'localStorage.getItem', 'localStorage.clear'
	];
	var nosupport = [];
	for (var i in items) {
		var chain = items[i].split('.');
		var reference = window;
		for (var c in chain) {
			if (typeof reference[chain[c]] !== 'undefined') {
				reference = reference[chain[c]];
			}
			else{
				nosupport.push(items[i]);
				break;
			}
		}
	}
	if ('undefined' === typeof (new XMLHttpRequest()).withCredentials) {
		nosupport.push('XMLHttpRequest.prototype.withCredentials');
	}
	return nosupport;
})();


W5.test = function(name, callback) {
	var module = W5.test;
	if ('undefined' === typeof callback) {
		for (var i = 0; i < module.instances.length; ++i) {
			if (name === module.instances[i].name) {
				callback = module.instances[i].callback;
				break;
			}
		}
	}
	var test = W5(document.createElement('pre'));
	test.name = name;
	test.callback = callback;
	test.run = function(func) { 
		try{
			if ('undefined' === typeof func) {
				this.callback();
			}
			else{
				func.apply(this);
			}
		}
		catch(error) {
			//alert(error.message);
			this.fail(error.message);
		}
	};
	test.ready = false;
	test.status = 'pending';
	test.fail = function(msg) {
		if (!this.ready) {
			this.ready = true;
			this.status = 'fail';
			this.report('test failed (' + msg + ')');
			this.fire('done');
		}
	};
	test.ok = function() {
		if (!this.ready) {
			this.ready = true;
			this.status = 'ok';
			this.report('test success!');
			this.fire('done');
		}
	};
	/*test.delay = function(func, ms) {
		if ('undefined' === typeof ms) { ms = 1000; }
		setTimeout(function() {
			this.run(func);
		}.bind(this), ms);
	};*/
	test.report = function(msg) {
		if (this.status === 'ok') {
			msg = '✓ ' + this.name + ': ' + msg;
		}
		else{
			msg = '✗ ' + this.name + ': ' + msg;
		}
		
		if (module.output === alert) {
			alert('TEST:\n\n' + msg);
		}
		else if (module.output === window.console) {
			window.console.log(msg);
		}
		else if (module.output instanceof Node && module.output.nodeType === 1) {
			module.output.innerHTML += msg + '<br>';
		}
	};

	
	if (module.instances.length > 0) {
		var prev = module.instances[module.instances.length-1];
	}
	
	if (prev && prev.ready === false) {
		prev.on('done', function() {
			this.run();
		}.bind(test));
	}
	else{
		if (!prev || prev.status === 'ok') {
			test.run();
		}
	}
	module.instances.push(test);
	//module.memory[test.name] = test;
};
W5.test.instances = [];
W5.test.output = window.console; // alert


W5.benchmark = function() { //W5.prototype.benchmark = 
	var module = this.benchmark;
	module.callbacks = Array.prototype.slice.call(arguments);
	module.conf = module.callbacks.shift();
	module.names = [];
	module.durations = [];
	for (var c = 0, len = module.callbacks.length; c < len; ++c) {
		for (var name in module.callbacks[c]) {
			module.names[c] = name;
			module.durations[c] = 1;
			module.callbacks[c] = module.callbacks[c][name];
		}
	}
	for (var r = 0; r < module.conf.rounds; ++r) {
		setTimeout(function() {
			for (var c = 0, len = module.callbacks.length; c < len; ++c) {
				var time = (new Date()).getTime();
				for (var i = 0; i < module.conf.iterations; ++i) {
					module.callbacks[c]();
				}
				module.durations[c] = module.durations[c] || 0;
				module.durations[c] += (new Date()).getTime()-time;
				//alert(module[0]);
			}
		}.bind(this), module.conf.timeout - Math.random());
	}
	setTimeout(function() {
		var maxlen = 0;
		for (var c = 0, len = module.names.length; c < len; ++c) {
			maxlen = Math.max(maxlen, module.names[c].length);
		}
		var report = '';
		if (this.item(0)) { report += '<b>'; }
		report += module.conf.name;
		if (this.item(0)) { report += '</b>'; }
		for (var c = 0, len = module.callbacks.length; c < len; ++c) {
			if (typeof module.durations[c] === 'undefined') {
				module.durations[c] = '--';
			}
			report += '\n' + module.names[c] + ': ' + Array(maxlen-module.names[c].length).join(' ') + '\t';
			report += module.durations[c] + 'ms\t\t';
			report += ~~(module.durations[c] / module.durations[0] * 100) + '%';
		}
		
		if (module.output === alert) {
			alert('BENCHMARK:\n\n' + report);
		}
		else if (module.output === window.console) {
			window.console.log(report);
		}
		else if (module.output instanceof Node && module.output.nodeType === 1) {
			module.output.innerHTML = '<pre>' + report + '</pre>';
		}

	}.bind(this), module.conf.timeout*module.conf.rounds + 10);
};
W5.benchmark.output = alert;


W5.prototype.debug = function(error, comment) {
	alert(comment + ' ' + JSON.stringify(error));
};

/* INIT */

W5.readyTimer = window.setInterval(function() {
	if (document && document.body) {
		window.clearInterval(W5.readyTimer);
		W5(document).fire('ready').off('ready');
	}
}, 1000);
W5(document).on('DOMContentLoaded', function(event) {
	window.clearInterval(W5.readyTimer);
	W5(document).fire('ready').off('ready'); 
});
W5(document).on('ready', function(event) {
	W5('[data-placeholder]').autoempty();
	W5('[data-autoresize]').autoresize();
});

