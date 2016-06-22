///////////////////////////
/**************************

██╗███╗   ███╗██████╗ ██████╗  ██████╗ ██╗   ██╗       ██╗███████╗
██║████╗ ████║██╔══██╗██╔══██╗██╔═══██╗██║   ██║       ██║██╔════╝
██║██╔████╔██║██████╔╝██████╔╝██║   ██║██║   ██║       ██║███████╗
██║██║╚██╔╝██║██╔═══╝ ██╔══██╗██║   ██║╚██╗ ██╔╝  ██   ██║╚════██║
██║██║ ╚═╝ ██║██║     ██║  ██║╚██████╔╝ ╚████╔╝██╗╚█████╔╝███████║
╚═╝╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═══╝ ╚═╝ ╚════╝ ╚══════╝

public domain (CC0)
by Nicky Case | @ncasenmare | ncase.me

--------------------------------------------------------

var Improv = function(dom,{
	data: {...},
	update: function(data, propName){},
	markup: "{NUMBER count} bottles of beer on the wall"
});

- dom: Optional. The dom element or query string to the DOM.
	If not provided, Improv will create a new DOM element.

- data: The data you'll be editing.

- update: Callback function whenever any of the data is changed.
	These arguments will be passed: update(data, propName)
	Where data is the data, and propName is the name of the property
	that was just edited.
 
- markup: Optional. If provided, it'll use this string to
	create widgets, instead of the given DOM's markup.

**************************/
///////////////////////////

var Improv = function(dom, config){

	var self = this;

	// Properties
	if(arguments.length>1){
		self.dom = (typeof dom=="string") ? document.querySelector(dom) : dom;
	}else{
		self.dom = document.createElement("span"); // make one!
		config = dom;
		dom = self.dom;
	}
	self.widgets = [];
	self.data = config.data;
	self.update = function(propName){

		// Run the user-given update function
		config.update(self.data, propName);

		// Update all widgets
		self.widgets.forEach(function(widget){
			widget.update();
		});

	};

	// CREATE THE WIDGETS
	
	// 1. Replace all {...} with <widget>...</widget> in innerHTML
	var html = self.dom.innerHTML;
	html = html ? html : config.markup; // no HTML? markup it is then!
	html = html ? html : "[PLEASE ADD MARKUP]"; // you goofed up
	var regex = /\{([^{}]*)\}/g;
	var replace = "<widget>$1</widget>";
	html = html.replace(regex, replace);
	self.dom.innerHTML = html;
	
	// 2. For each <widget>, parse its string and make a Widget
	var widgetNodes = self.dom.querySelectorAll("widget");
	Array.prototype.forEach.call(widgetNodes, function(node){
	
		// SPLIT MARKUP INTO: CLASS, PROPNAME, ARGS
		var markup = node.innerHTML;
		var split = markup.split(" ");

		// a. Class name
		var className = split[0];

		// b. Path name. Optional colon at the end, get rid of it.
		var propName = split[1];
		if(propName.slice(-1)==":") propName=propName.slice(0,-1);

		// c. Args, turn into array of [{key:"foo",value:"bar"}]
		var args = [];
		var _args = split.splice(2).join(" "); // Undo the space-splitting
		_args = _args.split(/,\s|,/); // split by comma! with optional space
		_args.forEach(function(arg){
			if(arg.indexOf("=")<0){ // If no "=", key=value=arg
				args.push({ key:arg, value:arg });
			}else{
				var argSplit = arg.split("=");
				args.push({ key:argSplit[0], value:argSplit[1] });
			}
		});
		
		// CREATE THAT WIDGET
		var WidgetClass = IWidgets[className];
		if(!WidgetClass) throw Error("No widget class named '"+className+"'!");
		var widget = new WidgetClass(self, propName, args);
		self.widgets.push(widget); // add to array
		node.parentNode.replaceChild(widget.dom, node); // replaceChild

	});

	// 3. Update!
	self.update();

};

///////////////////////////
/**************************

IMPROV WIDGETS

In the HTML:
{CLASS propName: key1=val1, key2=val2, key3, key4...}

In the JavaScript:
IWidgets.CLASS = function(improv, propName, args)

- CLASS: the class type of this widget
- improv: its parent Improv instance, which'll let it edit data & call an update
- propName: a string like "object.path.name"
- args: an array of [{key:"foo", value:"bar"}...]

**************************/
///////////////////////////

var IWidgets = {};

IWidgets._BASE_ = function(improv, propName, args){

	var self = this;

	// Properties
	self.improv = improv;
	self.propName = propName;
	self.args = args;

	// The All-Encompassing I Give Up On Good Coding Function
	// arg(key, function(value){ return value; }); - standardizes the values, or default
	// arg(key) - just returns value.
	self.arg = function(key, func){

		// Get the pair via key
		var pair = self.args.filter(function(arg){
			return arg.key==key;
		})[0];

		// If there's a function...
		if(func){
			// If pair doesn't exist, CREATE it, with null value.
			if(!pair) pair={key:key, value:undefined};
			self.args.push(pair);
			// Standardize the value with the function
			pair.value = func(pair.value);
		}
		
		// If it exists, return value. Otherwise nah.
		return pair ? pair.value : null;

	};

	// Get & Set Value
	self.getValue = function(){
		return improv.data[propName];
	};
	self.setValue = function(value){
		improv.data[propName] = value;
		improv.update(propName);
	};

	// Update - TO IMPLEMENT
	self.update = function(){};

};

/***************

NUMBER - A scrubbable number.

Arguments:
- min: minimum number allowed
- max: maximum number allowed
- step: when you drag, how much does the number increment/decrement
- drag: how much you have to drag to create a "step"
- prefix: what text comes before the number
- suffix: what text comes after the number

// TODO: plural(s), too.

***************/

IWidgets.NUMBER = function(improv, propName, args){
	
	var self = this;
	IWidgets._BASE_.apply(self, arguments);

	// Arguments, and their defaults
	var a = self.arg;
	a("min",function(value){ return value ? parseFloat(value) : IWidgets.NUMBER.min }); // -Infinity; });
	a("max",function(value){ return value ? parseFloat(value) : IWidgets.NUMBER.max }); // Infinity; });
	a("step",function(value){ return value ? parseFloat(value) : IWidgets.NUMBER.step }); // 1; });
	a("drag",function(value){ return value ? parseInt(drag) : IWidgets.NUMBER.drag }); // 10; });

	// Span with style
	var dom = document.createElement("span");
	dom.className = "improv-scrub";
	self.dom = dom;

	// Scrubbable UI
	dom.addEventListener("mousedown",function(event){

		// Initial
		var initValue = self.getValue();
		var initX = event.clientX;

		// Cursor!
		document.body.style.cursor = "col-resize";

		// Handlers
		var _onMouseMove = function(e){
			// Calculate & update new value
			var currX = e.clientX;
			var step = a("step");
			var drag = a("drag");
			var delta = Math.round((currX-initX)/drag)*step; // one "step" per 2px
			var newValue = initValue + delta;
			_updateValue(newValue);
			e.preventDefault(); // to stop the user-select thing
		};
		var _onMouseUp = function(e){
			document.body.style.cursor = null;
			window.removeEventListener("mousemove",_onMouseMove);
			window.removeEventListener("mouseup",_onMouseUp);
		};

		// Mouse Events
		window.addEventListener("mousemove",_onMouseMove);
		window.addEventListener("mouseup",_onMouseUp);

	},true);

	// When you change the number
	var _updateValue = function(value, initialUpdate){

		// ROUND TO THE NEAREST STEP
		var step = a("step");
		value = Math.round(value/step)*step;
		if(step<1){ // floating point shenanigans
			var decimals = step.toString().length-2;
			value = Number(Math.round(value+'e'+decimals)+'e-'+decimals);
		}

		// Calculate if it's within bounds
		var min = a("min");
		var max = a("max");
		if(value<min) value=min;
		if(value>max) value=max;

		// Text change
		var text = value;
		if(step<1){ // toFixed it!
			var decimals = step.toString().length-2;
			text = value.toFixed(decimals);
		}
		if(a("prefix")) text=a("prefix")+" "+text;
		if(a("suffix")) text=text+" "+a("suffix");
		dom.innerHTML = text;

		// SET VALUE - Unless we're initializing
		if(!initialUpdate) self.setValue(value);

	};

	// Initial Update!
	_updateValue(self.getValue(), true);

};

// DEFAULTS - User can override these!
IWidgets.NUMBER.min = -Infinity;
IWidgets.NUMBER.max = Infinity;
IWidgets.NUMBER.step = 1;
IWidgets.NUMBER.drag = 2;

/***************

CHOOSE - A dropdown selection.

Arguments: just the key-value array

***************/

IWidgets.CHOOSE = function(improv, propName, args){
	
	var self = this;
	IWidgets._BASE_.apply(self, arguments);

	// Yo' options
	var options = self.args;
	var selectedValue = self.getValue();

	// Create <select> dom
	var dom = document.createElement("select");
	for(var i=0;i<options.length;i++){

		var o = options[i];

		// Create & append <option>s
		var optionDOM = document.createElement("option");
		optionDOM.innerHTML = o.key;
		optionDOM.setAttribute("value",o.value);
		if(o.value==selectedValue) optionDOM.setAttribute("selected","true");
		dom.appendChild(optionDOM);

	}
	self.dom = dom;

	// Set data when you make a selection
	dom.onchange = function(){
		self.setValue(dom.value);
	};

};

/***************

ECHO - Just outputs out a variable. *Read-only!*

Arguments: none.

// TODO: HOLY FUCK PLEASE ESCAPE CHARS

***************/

IWidgets.ECHO = function(improv, propName, args){
	
	var self = this;
	IWidgets._BASE_.apply(self, arguments);

	// Just a Span
	var dom = document.createElement("span");
	self.dom = dom;

	// When updates, just echo the value.
	self.update = function(){
		dom.innerHTML = self.getValue();
	};

	// Update once!
	self.update();

};
