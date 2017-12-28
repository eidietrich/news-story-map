/* Graphic code */

var width = 800, height = 600;

var tooltip;

var svg = d3.select('#map')
  .append('svg')
  .attr("width", width)
  .attr("height", height)
var margin = {top: -50, left: 150, right: 60, bottom: 10};
var plotWidth = width - margin.left - margin.right,
  plotHeight = height - margin.top - margin.bottom;

var plot = svg.append('g')
  .attr('transform', 'translate('
    + margin.left + ',' + margin.top + ')');

var projection = d3.geoMercator()

var annotations, makeAnnotations;

var censusYears = ['2010', '2000', '1990', '1980', '1970', '1960', '1950', '1940', '1930', '1920', '1910', '1900', '1890']
var scaleYears = ['2010', '2000', '1970', '1950', '1910', '1890']
var colors = ['#1d91c0',
'#78c679','#ffc418','#ff8200','#f8171c','#a52a2a'];

var rScale = d3.scaleSqrt()
  .range([2, 30]);

var colorScale = d3.scaleLinear()
  .range(colors)
  .domain(scaleYears)

var numFormat = d3.format(',')
var perFormat = d3.format('.1%')

// Load data
d3.queue()
  .defer(d3.json, './data/montana.geojson')
  .defer(d3.json, './data/highways-minified.geojson')
  .defer(d3.json, './data/cities-w-butte.geojson')
  .defer(d3.csv, './data/mt-town-populations.csv')
  .defer(d3.json, './data/counties-minified.geojson')
  .awaitAll(function(error, files){

    var montana = files[0];
    var highways = files[1];
    var cities = files[2];
    var data = files[3];
    var counties = files[4];

    cities = join(cities, data, 'NAME', 'PLACE');
    cities = clean(cities);

    projection.fitSize([plotWidth, plotHeight], montana);
    rScale.domain([0, d3.max(cities.features, function(city){
      return city.properties.cen_2010;
    })]);
    // colorScale.domain([
    //   // d3.max(cities.features, function(city){
    //   //   return city.properties.perChange; }),
    //   0
    //   d3.min(cities.features, function(city){
    //     return city.properties.perChange; }),
    // ]);

    drawShapes(montana.features, 'state-boundary');

    drawHighways(highways.features);
    drawShapes(counties.features, 'counties')
    drawCities(cities.features);
    addLegends();
    // addAnnotations();
    initializeTooltip()
  });

function drawShapes(features, className='shape'){
  var shapes = d3.geoPath()
    .projection(projection);

  var counties = plot.append('g')
    .attr('class', '.feature-container');

  counties.selectAll('.' + className)
    .data(features).enter()
    .append('path')
    .attr('d', shapes)
    .attr('class', className)
    // .on('click', function(d){ console.log(d.properties); })
}
function drawHighways(features, className='highways'){
  var shapes = d3.geoPath()
    .projection(projection);

  var counties = plot.append('g')
    .attr('class', '.feature-container');

  counties.selectAll('.' + className)
    .data(features).enter()
    .append('path')
    .attr('d', shapes)
    .attr('class', className)
    .attr('stroke-width', function(d){
      var options = {
        'NHS INTERSTATE' : 2.5,
        'NHS NON-INTERSTATE' : 1.5,
        'PRIMARY' : 1,
      }
      return options[d.properties.SYSTEM] + 'px';
    })
    // .on('click', function(d){ console.log(d.properties); })
}

function drawCities(points){
  // console.log('cities', points);
  var cities = plot.append('g')
    .attr('class', '.city-container')
    .selectAll('.city')
    .data(points).enter()
    .append('g')

    .attr('transform', function(d){
      var xy = projection( d.geometry.coordinates[0])
      return 'translate(' + xy + ')';
    });

  cities.append('circle')
    .attr('class', 'city')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', function(d){
      return rScale(d.properties.maxPop);
    })
    .attr('fill', function(d){
      return colorScale(d.properties.maxYear);
    })
    .attr('stroke', function(d){
      return colorScale(d.properties.maxYear);
    })

  // cities.on('click', function(d){
  //   return console.log(d.properties.PLACE, d.properties.maxYear)})
}
function addLegends(){

  var colorLegend = d3.legendColor()
    .scale(colorScale)
    .shapeWidth(30)
    .orient('horizontal')
    .labelFormat(d3.format(""))
    .cells(censusYears)
    .title('Decade of peak census count')

  var sizeLegend = d3.legendSize()
    .scale(rScale)
    .shape('circle')
    .orient('vertical')
    .shapePadding(20)
    .cells([1000, 10000, 50000])
    .labelFormat(d3.format(","))
    .title('Peak population')

  plot.append('g')
    .attr('class', 'legendLinear')
    .attr('transform', 'translate(-90,550)')
    .call(colorLegend)

  plot.append('g')
    .attr('class', 'legendSize')
    .attr('transform', 'translate(-90,375)')
    .call(sizeLegend)
}
function addAnnotations(){
  annotations = [{"x":314,"y":276,"dx":31,"dy":42,"note":{"title":"Bozeman","label":""}},{"x":247,"y":77,"dx":-13,"dy":-24,"note":{"title":"Cut Bank","label":""}},{"x":567,"y":257,"dx":-11,"dy":61,"note":{"title":"Ekalaka","label":""}},{"x":223,"y":259,"dx":-73,"dy":33,"note":{"title":"Butte","label":""}},{"x":261,"y":286,"dx":-84,"dy":30,"note":{"title":"Virginia City","label":""}},{"x":303,"y":131,"dx":25,"dy":-79,"note":{"title":"Great Falls","label":""}},{"x":481,"y":259,"dx":-11,"dy":57,"note":{"title":"Colstrip","label":""}}];

  makeAnnotations = d3.annotation()
    .editMode(false)
    .type(d3.annotationLabel)
    .annotations(annotations)

  svg.append('g')
    .attr('class', 'annotation-group')
    .call(makeAnnotations)
}

function calcRate(begin, end, n){
  return Math.pow((end / begin), 1 / n) - 1;
}

function join(geojson, data, geoKey, dataKey){
  geojson.features.forEach(function(feature){
    var key = feature.properties[geoKey].toUpperCase()
    var match = data.filter(function(d){
      return d[dataKey] === key;
    })[0];
    feature.properties = match;
  })
  return geojson;
}

function initializeTooltip(){
  function updateTooltip(e){
    var coords = projection(e.geometry.coordinates[0]);
    var props = e.properties;

    tooltip.html('')
    var infobox = tooltip.append('g')
      .attr('class', 'infobox')
      .attr('transform', 'translate(' + (coords[0] - 20 ) + ',' + (coords[1]) + ')')

    // var infobox = tooltip.append('g').attr('transform', 'translate(400,470)')
    infobox.append('rect')
      .attr('x', -180)
      .attr('y', -20)
      .attr('width', 190)
      .attr('height', 82)
    infobox.append('text').html(props.PLACE)
    infobox.append('text').html('Peak: <tspan class="strong"> ' + numFormat(props.maxPop) + '</tspan> in <tspan class="strong">' + props.maxYear + '</tspan>').attr('y', 18)
    infobox.append('text').html('<tspan class="strong">' + numFormat(props.cen_2010) + '</tspan> people in 2010').attr('y', 36)
    infobox.append('text').html('<tspan class="strong"> ' + perFormat(props.fractionOfPeak) + '</tspan> of peak').attr('y', 54)



    //   .append('text')
    //     .text('I am here')
    //     .attr('x', 0)
    //     .attr('y', 0)
    tooltip
      .style('display', 'block')
  }

  function hideTooltip(){
    tooltip
      .style('display', 'none')
  }

  // NB: Bootstrap does weird things with '.tooltip' class
  tooltip = svg.append('g')
   .attr('transform', 'translate('
    + margin.left + ',' + margin.top + ')')
    .attr('class', 'infobox')

  plot.selectAll('.city')
    .on('mouseover', updateTooltip)
    .on('mouseout', hideTooltip)
}

function clean(geojson){

  geojson.features.forEach(function(feature){
    // // filter
    // var props = feature.properties;
    // var keep = {
    //   name: props["NAME"],
    //   pop_2010: props['respop72010'],
    //   pop_2014: props['respop72014'],
    //   pop_2015: props['respop72015']
    // }
    // feature.properties = keep;

    // process
    var props = feature.properties;
    var maxPop = 0, maxYear = null;
    censusYears.forEach(function(cenYear){
      var key = 'cen_' + cenYear;
      props[key] = +props[key];
      var pop = props[key];
      if (pop > maxPop) {
        maxPop = pop;
        maxYear = cenYear;
      }
    })
    props.maxPop = maxPop;
    props.maxYear = maxYear;
    props.fractionOfPeak = props.cen_2010 / maxPop;
  });

  // Sort descending by size so small ones draw on top of big ones
  geojson.features.sort(function(a,b){
    return b.properties['cen_2010'] - a.properties['cen_2010'];
  });

  return geojson;
}