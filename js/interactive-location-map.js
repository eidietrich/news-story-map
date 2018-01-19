

/* Map object */

function Map(anchor, width=400, height=400, margin) {
  this.anchor = anchor;
  this.width = width;
  this.height = height;
  this.margin = margin;

  this.plotWidth = this.width - this.margin.left - this.margin.right;
  this.plotHeight = this.height - this.margin.top - this.margin.bottom;

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

    this.plot.append('g')
      .attr('classname','basemap')
      .selectAll("image")
        .data(tiles)
      .enter().append("image")
        .attr("xlink:href", makeTileUrl)
        .attr("x", function(d) { return (d[0] + tiles.translate[0]) * tiles.scale; })
        .attr("y", function(d) { return (d[1] + tiles.translate[1]) * tiles.scale; })
        .attr("width", tiles.scale)
        .attr("height", tiles.scale);
};
Map.prototype.addContainer = function(className){
  // adds container (e.g. for tooltip)
  console.log('adding container', className);

  this.plot.append('g')
    .attr('class', className)
}


/* Graphic code */
var maxWidth = 500;
var margin = {top: 10, left: 10, right: 10, bottom: 10};

var markerRadius = 15;

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
  {event: 'mouseover', handler: highlightMarker},
]

d3.queue()
  .defer(d3.json, './data/west-mt-bound.geojson')
  .defer(d3.json, './data/cities.geojson')
  .defer(d3.csv, './data/sjn-mt-stories.csv')
  .awaitAll(function(error, files){
    if (error) throw error;

    var bounding = files[0];
    var cities = files[1];
    var data = files[2];

    cities = process(data, cities)

    map.setBounds(bounding);
    map.addTileBasemap('./assets/mt-tiles');
    map.addPointLayer(cities.features, 'city', buildMarker, pointListeners)
    map.addContainer('tooltip')

    updateInfobox();

  });


// map-specific functions
function buildMarker(d){

  var marker = d3.select(this).append('g')
    .attr('class', 'map-marker')

  marker.append('circle')
    .attr('class', 'shadow')
    .attr('cx', 1)
    .attr('cy', 1)
    .attr('r', 13)
  marker.append('circle')
    .attr('class', 'marker-icon')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 12)
}

function highlightMarker(d){
  console.log('hiMarker')
  // clear highlight
  d3.select('.tooltip').html('')
  d3.selectAll('.map-marker').classed('highlight',false)
  d3.selectAll('cluster-points').html('')

  var enterTransition = d3.transition()
    .duration(200);

  var tooltip = d3.select('.tooltip')
    .attr('transform', function(){
      var xy = map.projection(d.geometry.coordinates[0])
      return 'translate(' + xy + ')';
    });
  var cluster = tooltip.append('g')
    .attr('class', 'cluster')
  var data = d.properties.stories.reverse(); // to control render order
  var points = cluster.selectAll('.point')
      .data(data).enter()
      .append('g')

  // cluster geometry calcs
  var n = points.size()
  var spreadDist = 2 * markerRadius + 4;
  // // for radial spread
  // var spreadAngle = 360 / n;
  // var spreadRadius = spreadDist / (2 * Math.sin(Math.PI / n));

  // move points groups
  points
  .transition(enterTransition)
  // // ALT DISPLAY - radial spread
  // .attr('transform', function(d, i){
  //   if (n <= 1) return 'rotate(180)';
  //   else return 'rotate(' + (180 + i * spreadAngle) + '), translate(0,' + spreadRadius + ')';
  // });
  .attr('transform', function(d, i){
    var j = (n - i - 1) // to control render order
    return 'translate(0,' + (j * spreadDist) + ')';
  });

  // draw points elements
  points
    .append('circle')
    .attr('class', 'shadow')
      // for radial spread
      // .attr('transform', function(d,i){
      //   return 'rotate(' + (180 - i * spreadAngle) + ')';
      // })
      .attr('cx', 1)
      .attr('cy', 1)
      .attr('r', markerRadius + 1);
  points
    .append('circle')
    .attr('class', 'point')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', markerRadius);

  // draw icon on top of points
  cluster
    .append('circle')
    .attr('class', 'marker-icon-on-top')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', markerRadius);


  // apply highlight class
  d3.select(this).select('.map-marker').classed('highlight', true)

  // add point-specific event listener
  points.on('mouseover', highlightPoint)
  // highlight first point
  points.filter(function(d,i){ return i === (n-1); })
    .dispatch('mouseover');
}

function highlightPoint(d){
  d3.selectAll('.point').classed('highlight', false)
  d3.select(this).select('.point').classed('highlight', true)
  updateInfobox(d);
  // stop highlightCluster from running agin
  d3.event.stopPropagation();
}

function buildTease(story){
  var link = d3.select(this).append('a')
    .attr('href', story.link)
    .attr('target','_blank');
  link.append('div').attr('class', 'dateline')
    .html(story.dateline)
  link.append('div').attr('class','headline').html(story.headline)
  link.append('div').attr('class','subheadline')
    .html(story.subhead)
  link.append('div').attr('class','byline')
    .html(story.byline + ', ' + story.publication)
}

function updateInfobox(item=null){
  // console.log('infobox', item);
  infobox.html('')
  if (item === null) {
    infobox.append('div')
      .attr('class', 'default')
      .html('Tap or hover to select story by city')
  }
  else {
    infobox
      .selectAll('a')
      .data([item]).enter()
        .append('div')
        .attr('class', 'teasebox')
        .each(buildTease)
  }
}


/* Data handling */

function process(data, geodata){
  // data is array of story objects, keyed to 'place'
  // geofile is geojson of points, keyed to 'NAME'
  // this nests data (to account for multiple stories from same locale), then performs a left merge
  var dataKey = 'place'
  var geoKey = 'NAME'

  var nested = d3.nest()
    .key(function(d) { return d[dataKey]; })
    .entries(data)

  var processed = {
    features: []
  }

  nested.forEach(function(locale){
    var match = geodata.features.filter(function(point){
      return locale.key.toUpperCase() === point.properties[geoKey].toUpperCase()
    });
    if (match.length > 0){
      processed.features.push({
        geometry: match[0].geometry,
        properties: {stories: locale.values}
      })
    } else {
      console.log('no match for ' + locale.key)
    }
  })

  return processed;
}

// function join(geojson, data, geoKey, dataKey){
//   var included = {
//     features: []
//   }

//   geojson.features.forEach(function(feature){
//     var key = feature.properties[geoKey].toUpperCase()
//     var match = data.filter(function(d){
//       return d[dataKey] === key;
//     })[0];
//     if (match) {
//       feature.properties = match;
//       included.features.push(feature)
//     }
//   });
//   // console.log('Matches found for ' + included.features.length + ' of ' + data.length + 'stories')
//   // console.log(included)
//   return included;
// }