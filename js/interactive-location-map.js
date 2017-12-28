

/* Map object */

function Map(anchor, width=400, height=400, margin) {
  this.anchor = anchor;
  this.width = width;
  this.height = height;
  this.margin = margin;

  this.plotWidth = this.width - this.margin.left - this.margin.right;
  this.plotHeight = this.height - this.margin.top - this.margin.bottom;
  console.log(this.plotWidth, this.margin.left, this.margin.right, this.width)

  // // plot margins within svg
  // this.svg = d3.select(anchor)
  //   .append('svg')
  //   .attr("width", width)
  //   .attr("height", height)
  // this.plot = this.svg.append('g')
  //   .attr('transform', 'translate('
  //   + this.margin.left + ',' + this.margin.top + ')');

  // plot with no margins
  this.plot = d3.select(anchor)
    .append('svg')
    .attr('width', this.plotWidth)
    .attr('height', this.plotHeight)

  this.projection = d3.geoMercator()
}
Map.prototype.setBounds = function(bounding){
  console.log('setting bounds')
  if (bounding) { this.boundingObject = bounding; }// Geojson
  this.projection.fitSize([this.plotWidth, this.plotHeight], this.boundingObject);
}
Map.prototype.addShapeLayer = function(features, className='shape'){
  console.log('shape layer', features)
  var shapeFunction = d3.geoPath()
    .projection(this.projection);

  var container = this.plot.append('g')
    .attr('class', '.feature-container');

  container.selectAll('.' + className)
    .data(features).enter()
    .append('path')
    .attr('d', shapeFunction)
    .attr('class', className)
};
Map.prototype.addPointLayer = function(features, className='point', pointFunction, listeners){
  console.log('point layer', features);

  function defaultPoint(d){
    d3.select(this).append('circle')
    .attr('class', className)
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 10)
  }

  drawPoint = pointFunction || defaultPoint;

  // Create and place point groups
  var that = this;
  var points = this.plot.append('g')
    .attr('class', '.point-container')
    .selectAll('.' + className)
    .data(features).enter()
    .append('g')
    .attr('transform', function(d){
      var xy = that.projection(d.geometry.coordinates[0])
      return 'translate(' + xy + ')';
    });

  // Draw points
  points
    .attr('class','point-group')
    .each(drawPoint);

  // Add event listeners to points
  if (listeners !== null) {
    listeners.forEach(
      function(d){ points.on(d.event, d.handler)
    });
  }
};
Map.prototype.addTileBasemap = function(tileDirPath){
    console.log('drawing base map')

    function makeTileUrl(d){
      // var url = "http://" + "abc"[d[1] % 3] + ".tile.openstreetmap.org/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
      var url = tileDirPath + "/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
      // console.log(url);
      return url;
    }

    var tiles = d3.tile()
      .size([this.plotWidth, this.plotHeight])
      .translate(this.projection([0, 0]))
      .scale(this.projection.scale() * 2 * Math.PI)();

    this.plot.selectAll("image")
        .data(tiles)
      .enter().append("image")
        .attr("xlink:href", makeTileUrl)
        .attr("x", function(d) { return (d[0] + tiles.translate[0]) * tiles.scale; })
        .attr("y", function(d) { return (d[1] + tiles.translate[1]) * tiles.scale; })
        .attr("width", tiles.scale)
        .attr("height", tiles.scale);
};


/* Graphic code */
var maxWidth = 500;
var margin = {top: 10, left: 10, right: 10, bottom: 10};

var viz = d3.select('#viz')
viz.append('div').attr('id','map')

var vizWidth = document.getElementById('map').offsetWidth;
var width = Math.min(maxWidth, vizWidth) - 2;
var height = width;
var map = new Map('#map', width, height, margin)

var infobox = viz
  .append('div')
  .attr('class','infobox')

var pointListeners = [
  // Add focus event?
  {event: 'mouseover', handler: function(d){
    d3.selectAll('.city').classed('highlight', false)
    d3.select(this).select('.city').classed('highlight', true)
    updateInfobox(d); }
  },
  {event: 'touchstart', handler: function(d){ updateInfobox(d); }},
  // {event: 'click', handler: function(d){ updateInfobox(); }}
]

d3.queue()
  .defer(d3.json, './data/west-mt-bound.geojson')
  .defer(d3.json, './data/cities.geojson')
  .defer(d3.csv, './data/mt-stories.csv')
  .awaitAll(function(error, files){
    if (error) throw error;

    var bounding = files[0];
    var cities = files[1];
    var data = files[2];

    cities = join(cities, data, 'NAME', 'PLACE');
    cities = clean(cities);

    map.setBounds(bounding);
    map.addTileBasemap('./assets/mt-tiles');
    map.addPointLayer(cities.features, 'city', null, pointListeners)
    updateInfobox();

  });

function updateInfobox(item=null){

  infobox.html('')
  if (item === null) {
    infobox.append('div')
      .attr('class', 'default')
      .html('Tap or hover to select story by city')
  }
  else {
    var props = item.properties;
    var link = infobox.append('a')
      .attr('href', props.link)
      .attr('target','_blank');
    link.append('div').attr('class', 'dateline')
      .html(props.dateline)
    link.append('div').attr('class','headline').html(props.headline)
    link.append('div').attr('class','subheadline')
      .html(props.subhead)
    link.append('div').attr('class','byline')
      .html(props.byline + ', ' + props.publication)
  }
}

// function addLegends(){

//   var colorLegend = d3.legendColor()
//     .scale(colorScale)
//     .shapeWidth(30)
//     .orient('horizontal')
//     .labelFormat(d3.format(""))
//     .cells(censusYears)
//     .title('Decade of peak census count')

//   var sizeLegend = d3.legendSize()
//     .scale(rScale)
//     .shape('circle')
//     .orient('vertical')
//     .shapePadding(20)
//     .cells([1000, 10000, 50000])
//     .labelFormat(d3.format(","))
//     .title('Peak population')

//   svg.append('g')
//     .attr('class', 'legendLinear')
//     .attr('transform', 'translate(10,350)')
//     .call(colorLegend)

//   svg.append('g')
//     .attr('class', 'legendSize')
//     .attr('transform', 'translate(10,220)')
//     .call(sizeLegend)
// }
// function addAnnotations(){
//   annotations = [{"x":314,"y":276,"dx":31,"dy":42,"note":{"title":"Bozeman","label":""}},{"x":247,"y":77,"dx":-13,"dy":-24,"note":{"title":"Cut Bank","label":""}},{"x":567,"y":257,"dx":-11,"dy":61,"note":{"title":"Ekalaka","label":""}},{"x":223,"y":259,"dx":-73,"dy":33,"note":{"title":"Butte","label":""}},{"x":261,"y":286,"dx":-84,"dy":30,"note":{"title":"Virginia City","label":""}},{"x":303,"y":131,"dx":25,"dy":-79,"note":{"title":"Great Falls","label":""}},{"x":481,"y":259,"dx":-11,"dy":57,"note":{"title":"Colstrip","label":""}}];

//   makeAnnotations = d3.annotation()
//     .editMode(false)
//     .type(d3.annotationLabel)
//     .annotations(annotations)

//   svg.append('g')
//     .attr('class', 'annotation-group')
//     .call(makeAnnotations)
// }

// function calcRate(begin, end, n){
//   return Math.pow((end / begin), 1 / n) - 1;
// }

// var annotations, makeAnnotations;

// var colors = {
//   '2010': '#66a61e',
//   '2000': '#e7298a', '1990': '#e7298a', '1980': '#e7298a',
//   '1970': '#d95f0e', '1960': '#d95f0e', '1950': '#d95f0e',
//   '1940': '#e6ab02', '1930': '#e6ab02', '1920': '#e6ab02',
//   '1910': '#a6761d', '1900': '#a6761d', '1890': '#a6761d'
// }

// var censusYears = ['2010', '2000', '1990', '1980', '1970', '1960', '1950', '1940', '1930', '1920', '1910', '1900', '1890']
// var scaleYears = ['2010', '2000', '1970', '1950', '1910', '1890']
// // var colors = ['#1d91c0',
// // '#8c2d04','#973b0a','#a14a10','#ab5717','#b6641e','#c07224','#cb7f2b','#d58c32','#df9b39','#eaa840','#f4b647','#fec44f'];
// var colors = ['#1d91c0',
// '#78c679','#ffc418','#ff8200','#f8171c','#a52a2a'];

// var rScale = d3.scaleSqrt()
//   .range([0, 20]);

// var colorScale = d3.scaleLinear()
//   .range(colors)
//   .domain(scaleYears)

/* Data handling */

function join(geojson, data, geoKey, dataKey){
  var included = {
    features: []
  }

  geojson.features.forEach(function(feature){
    var key = feature.properties[geoKey].toUpperCase()
    var match = data.filter(function(d){
      return d[dataKey] === key;
    })[0];
    if (match) {
      feature.properties = match;
      included.features.push(feature)
    }
  });
  return included;
}

function clean(geojson){

  // geojson.features.forEach(function(feature){
  //   // // filter
  //   // var props = feature.properties;
  //   // var keep = {
  //   //   name: props["NAME"],
  //   //   pop_2010: props['respop72010'],
  //   //   pop_2014: props['respop72014'],
  //   //   pop_2015: props['respop72015']
  //   // }
  //   // feature.properties = keep;

  //   // process
  //   var props = feature.properties;
  //   var maxPop = 0, maxYear = null;
  //   censusYears.forEach(function(cenYear){
  //     var key = 'cen_' + cenYear;
  //     props[key] = +props[key];
  //     var pop = props[key];
  //     if (pop > maxPop) {
  //       maxPop = pop;
  //       maxYear = cenYear;
  //     }
  //   })
  //   props.maxPop = maxPop;
  //   props.maxYear = maxYear;
  //   props.fractionOfPeak = props.cen_2010 / maxPop;
  // });

  // // Sort descending by size so small ones draw on top of big ones
  // geojson.features.sort(function(a,b){
  //   return b.properties['cen_2010'] - a.properties['cen_2010'];
  // });

  return geojson;
}