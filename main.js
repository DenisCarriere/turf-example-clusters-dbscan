const {
  featureEach, coordAll, // @turf/meta
  point, polygon, featureCollection, // @turf/helpers
  centroid} = turf
const {clusterEach, clusterReduce} = clusters

const map = L.map('app').setView([45.414444, -75.697100], 12)

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
  maxZoom: 18,
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
  id: 'mapbox.streets'
}).addTo(map)

map.doubleClickZoom.disable()

// Layers
const points = turf.featureCollection([])
const layer = L.layerGroup([])
layer.addTo(map)

// Map Click -- reduce distance by 100 meters
let DISTANCE = 1000
let descending = true
let COUNT = 0
let FEATURES = 0
const INCREMENT = 200

function onMapClick (e) {
  if (descending === true && DISTANCE > 200) DISTANCE -= INCREMENT
  if (descending === false && DISTANCE < 1000) DISTANCE += INCREMENT
  if (DISTANCE <= 200) descending = false
  if (DISTANCE >= 1000) descending = true
  if (points.features.length > 3) {
    layer.clearLayers()
    const clustered = clustersDbscan(points, DISTANCE, 'meters')
    L.geoJSON(styleResult(clustered), {style, pointToLayer}).addTo(layer);
  }
  document.getElementById("counters").innerHTML = `Points: ${clustered.features.length}, Clusters: ${count}, Distance: ${DISTANCE}m`;
}

// Map Move -- create a point
function onMapMove (e) {
  const {lat, lng} = e.latlng
  L.circle(e.latlng, 20, {
    color: '#000',
    fill: true,
    fillColor: 'black',
    fillOpacity: 1,
    opacity: 1
  }).addTo(map)

  points.features.push(point([lng, lat]))
  if (points.features.length > 3) {
    layer.clearLayers()
    const clustered = clustersDbscan(points, DISTANCE, 'meters')
    L.geoJSON(styleResult(clustered), {style, pointToLayer}).addTo(layer);
  }
}

function pointToLayer (feature, latlng) {
  return L.circleMarker(latlng, feature.properties);
}

function style (feature) {
  return feature.properties
}

// https://github.com/Turfjs/turf/pull/851
function styleResult(clustered) {
    const count = clusterReduce(clustered, 'cluster', i => i + 1, 0);
    const colours = chromatism.adjacent(360 / count, count, '#0000FF').hex;
    const features = [];
    COUNT = count;
    FEATURES = features;

    // Add Counters
    document.getElementById("counters").innerHTML = `Points: ${clustered.features.length}, Clusters: ${count}, Distance: ${DISTANCE}m`;

    // Iterate over each Cluster
    clusterEach(clustered, 'cluster', (cluster, clusterValue, clusterId) => {
        const color = colours[clusterId]
        const darkColor = chromatism.brightness(-25, colours[clusterId]).hex;

        // Add concave polygon
        const coords = coordAll(cluster)
        if (coords.length > 4) {
          features.push(polygon([concaveman(coords)], {
              color: darkColor,
              stroke: true,
              fillOpacity: 0.3,
              fillColor: darkColor
          }));
          features.push(centroid(cluster, {
            color,
            fillColor: color,
            weight: 1,
            opacity: 1,
            fillOpacity: 1,
            radius: 8
          }))
        }
    });
    return featureCollection(features);
}

// Map Interactions
map.on('click', onMapClick)
map.on('mousemove', onMapMove)