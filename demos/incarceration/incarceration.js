// Width & Height & Margin & Crap
var margin = {top: 20, right: 20, bottom: 30, left: 50},
	width = 500 - margin.left - margin.right,
	height = 400 - margin.top - margin.bottom;

// CREATE SVG (and Mega-Container)
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// SCALES
var xScale = d3.time.scale().range([0, width]); // set range, but not domain yet.
var yScale = d3.scale.linear().range([height, 0]);

// AXES
var xAxis = d3.svg.axis().scale(xScale).orient("bottom");
var yAxis = d3.svg.axis().scale(yScale).orient("left");

// The line itself...
var line = d3.svg.line()
		.x(function(d){ return xScale(d.year); }) // parse date -> x
		.y(function(d){ return yScale(d.rate); }); // parse price/close -> y

// PARSE DAT DATA THO
var formatDate = d3.time.format("%Y");
function type(d) {
	d.year = formatDate.parse(d.year);
	d.rate = +d.rate; // the cheater's way of doing .parseFloat()
	return d;
}

// Decay & Uncertainty
var EXTRA_YEARS = 37;
var UNCERTAINTY_STEPS = 10;

// Get the data & parse it...
var data;
var pastLine = null;
var futureLines = [];
d3.csv("incarceration.csv", type, function(error, _data){

	if(error) // NOW YOU FUCKED UP.
		throw error; // YOU HAVE FUCKED UP NOW.

	// Make global
	data = _data;

	// Set scales' domains - .extent() gets the min & max simultaneously, yay.
	var yearInterval = d3.extent(data, function(d){ return d.year; });
	var endYear = new Date(yearInterval[1].getTime()); // clone object!
	endYear.setFullYear(endYear.getFullYear() + EXTRA_YEARS); // plus 15 years
	yearInterval[1] = endYear;
	xScale.domain(yearInterval);
	yScale.domain([0, d3.max(data, function(d){ return d.rate; })]);

	// Draw X axis
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
		// and label
		.append("text")
		.attr("class", "label")
        .attr("x", width/2)
        .attr("y", margin.bottom)
        .style("text-anchor", "middle")
        .text("Year");

	// Draw Y Axis
	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		// aaand the label
		.append("text")
		.attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left)
        .attr("x", -(height/2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("U.S. Incarceration Rate Per 100,000 Americans");

	// Draw the line path
	pastLine = svg.append("path").attr("class", "line");

	// MULTIPLE PROJECTIONS
	for(var i=0; i<UNCERTAINTY_STEPS; i++){

		// Draw projection
		var futureLine = svg.append("path").attr("class", "projection line");
		futureLines.push(futureLine);

	}

	// DRAW
	draw();

	// IMPROV
	var improv = new Improv("#input",{
		data:params,
		update: function(data){
			draw();
		}
	});

});

// Draw it!
var draw = function(){

	// PAST
	pastLine.datum(data) // .datum() coz it's ONE svg element
		.attr("d", line);

	// Start year
	var startYear = d3.max(data, function(d){ return d.year; });
	startYear = new Date(startYear.getTime()); // clone object!

	// Params...
	var decay = (100-params.fall)/100;
	var uncertainty = (params.uncertainty)/100;

	// MULTIPLE PROJECTIONS
	for(var i=0; i<UNCERTAINTY_STEPS; i++){

		// Decay
		var t = (i-((UNCERTAINTY_STEPS-1)/2))/((UNCERTAINTY_STEPS-1)/2); // -1 at 0, 1 at uncertaintySteps-1
		var decay2 = decay + uncertainty*t;
		if(decay2>1) decay2=1;
		if(decay2<0) decay2=0;

		// Figure out projection
		var projectionData = [];
		projectionData.push({
			year: startYear,
			rate: data[data.length-1].rate
		});
		for(var j=1; j<=EXTRA_YEARS; j++){
			var lastProjection = projectionData[j-1];
			var lastRate = lastProjection.rate;
			var currYear = new Date(lastProjection.year.getTime());
			currYear.setFullYear(currYear.getFullYear() + 1);
			var currRate = lastRate * decay2; // Math.round(lastRate * decay2);
			if(currRate<0) currRate=0;
			projectionData.push({
				year: currYear,
				rate: currRate
			});
		}

		// Draw projection
		var futureLine = futureLines[i];
		futureLine.datum(projectionData) // .datum() coz it's ONE svg element
			.attr("d", line);

	}

};