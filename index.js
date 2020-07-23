const fs = require('fs-extra'),
    request = require('request'),
    async = require("async"),
    unzipper = require("unzipper"),
    xml2js = require('xml2js'),
    chroma = require('chroma-js');

const dateMarker = require('./markers/dateMarker.json'),
    germanyMarker = require('./markers/germanyMarker.json'),
    defaultMarker = require('./markers/defaultMarker.json');


// list of stations:
// https://www.dwd.de/DE/leistungen/klimadatendeutschland/statliste/statlex_html.html?view=nasPublication&nn=16102
// better source of active sations 
// https://github.com/FL550/simple_dwd_weatherforecast/blob/master/simple_dwd_weatherforecast/mosmix_stationskatalog.txt

const stations = [
	// {id:'10384',label:'Berlin','name':'BERLIN-TEMPELHOF'},
	// {id:'P0489',label:'Leipzig','name':'LEIPZIG'},
	{id:'10389',label:'Berlin','name':'BERLIN-ALEX.'},
	{id:'P0489',label:'Hamburg','name':'HAMBURG INNENSTADT '},
	{id:'10865',label:'München','name':'MUENCHEN STADT'},
	{id:'L838',label:'Frankfurt','name':'FRANKFURT'},
	{id:'H744',label:'Köln','name':'KOELN-STAMMHEIM'},
	{id:'10487',label:'Dresden','name':'DRESDEN-STADT'},
	{id:'Q358',label:'Stuttgart','name':'STUTTGART NECKARTAL'}
];

// list of conditions and priority
// https://www.dwd.de/DE/leistungen/opendata/help/schluessel_datenformate/kml/mosmix_element_weather_xls.xlsx?__blob=publicationFile&v=4
const weatherCodes = {
    "1":{type:"sunny",priority:29},
    "0": {type:"sunny",priority:28},
    "2":{type:"partlycloudy",priority:27},
    "3":{type:"cloudy",priority:26},
    "45": {type:"cloudy",priority:25}, // fog
    "49": {type:"cloudy",priority:24},
    "51": {type:"rainy",priority:20},
    "53": {type:"rainy",priority:19},
    "55": {type:"rainy",priority:18},
    "56": {type:"rainy",priority:3},
    "57": {type:"rainy",priority:2},
    "61": {type:"rainy",priority:23},
    "63": {type:"rainy",priority:22},
    "65": {type:"rainy",priority:21},
    "66": {type:"rainy",priority:5},
    "67": {type:"rainy",priority:4},
    "68": {type:"rainy",priority:17},
    "69": {type:"snowy",priority:16}, // snowy-rainy
    "71": {type:"snowy",priority:15},
    "73": {type:"snowy",priority:14},
    "75": {type:"snowy",priority:13},
    "80": {type:"rainy",priority:12},
    "81": {type:"rainy",priority:11}, // pouring
    "82": {type:"rainy",priority:10}, // pouring
    "83": {type:"snowy",priority:9}, // snowy-rainy
    "84": {type:"snowy",priority:8}, // snowy-rainy
    "85": {type:"snowy",priority:7}, // snowy-rainy
    "86": {type:"snowy",priority:6}, // snowy-rainy
    "95": {type:"lightning",priority:1}
}

const cityMarkerSettings = {
    "Berlin":{
        coordinates: [13.083443472293084,52.47309944163794],
        "anchor": "middle-left",
        "offsetY": 0,
        "offsetX": 0      
    },
    "Dresden":{
        "coordinates": [13.7381437,51.0493286],
        "anchor": "middle-left",
        "offsetY": -1,
        "offsetX": 3     
    },
    "Frankfurt":{
        "coordinates": [8.690137100472498,50.110071121975494],
        "anchor": "middle-right",
        "offsetY": 0,
        "offsetX": 0        
    },
    "Hamburg":{
        "coordinates": [9.919407639367364,53.552389285224905],
        "anchor": "bottom-left",
        "offsetY": -17,
        "offsetX": 14
    },
    "Köln":{
        "coordinates": [6.959974,50.938361],
        "anchor": "middle-right",
        "offsetY": 0,
        "offsetX": 0
    },
    "München":{
        "coordinates": [11.5753822,48.1371079],
        "anchor": "middle-right",
        "offsetY": 0,
        "offsetX": 0
    },
    "Stuttgart":{
        "coordinates": [9.1800132,48.7784485],
        "anchor": "middle-right",
        "offsetY": 0,
        "offsetX": 0
    }
};

const icons = {
    "rainy": {"id":"rain","path":"M0 506q0 90 64 154t155 65q17 0 31-2 43 61 109 93 68 33 141 33t140-33q66-32 110-93 13 2 31 2 90 0 154-65t64-154-64-154-154-65q-42 0-78 14-88-76-203-76t-203 76q-37-14-78-14-90 0-155 65t-64 154z m187-406q0 35 63 125l16-24q17-26 31-54 15-32 15-47 0-25-18-44t-44-19-44 19-19 44z m252-188q0 35 63 125l15-23q18-27 32-55 15-32 15-47 0-25-18-44t-44-18-44 18-19 44z m248 63q0 35 63 125l15-24q18-26 31-54 16-32 16-47 0-25-18-44t-44-19-44 19-19 44z","horiz-adv-x":1000,"height":698.3333333333334,"width":998.3333333333334},
    "lightning":{"id":"cloud-flash-inv","path":"M0 506q0 90 64 154t155 65q17 0 31-2 43 61 109 93 68 33 141 33t140-33q66-32 110-93 13 2 31 2 90 0 154-65t64-154-64-154-154-65q-42 0-78 14-76-66-182-74l-21-65 62-62-187-188 62 188-62 62 68 69q-84 15-146 70-37-14-78-14-90 0-155 65t-64 154z","horiz-adv-x":1000,"height":761,"width":998.3333333333334},
    "cloudy": {"id":"cloud-inv","path":"M0 319q0 89 64 154t155 64q17 0 31-2 43 61 109 94 68 33 141 33t140-33q66-33 110-94 13 2 31 2 90 0 154-64t64-154-64-155-154-64q-42 0-78 14-88-77-203-77t-203 77q-37-14-78-14-90 0-155 64t-64 155z","horiz-adv-x":1000,"height":699,"width":998.3333333333334},
    "sunny": {"id":"sun-1","path":"M491 614l-53 152q-7 22 3 42t31 28q30 10 56-11t14-59z m-418-211l154-53-154-52q-21-8-42 3t-28 32q-10 30 12 56t58 14z m418-317l51-152q7-21-3-42t-31-28q-30-10-56 12t-14 58z m486 282q10-30-12-57t-58-13l-153 52 153 53q21 7 42-3t28-32z m-819 240q-21 10-28 31t3 42q16 32 50 30t49-30l71-145z m0-614q-31 16-30 50t30 49l145 71-71-145q-10-21-31-28t-43 3z m664 99q21-10 28-32t-3-42q-16-31-50-30t-49 30l-71 145z m0 613q31-16 30-50t-30-48l-145-72 71 145q10 22 31 29t43-4z m-331-121q96 0 165-69t68-166-68-165-165-70-166 70-69 165 69 166 166 69z","horiz-adv-x":980,"height":700.0000000000001,"width":980.0000000000001},
    "partlycloudy": {"id":"cloud-sun","path":"M0 131q0 88 62 151t149 68q-24 45-24 93 0 90 65 155t154 64q89 0 153-62 63-62 66-153 75-32 125-99 13 2 31 2 90 0 154-65t64-154-64-154-154-65q-42 0-78 14-88-76-203-76t-203 76q-37-14-78-14-90 0-155 65t-64 154z m0 312q0 14 9 23t22 9h63q13 0 22-9t9-23-9-22-22-9h-63q-13 0-22 9t-9 22z m119 243q-21 23 0 44t45 0l43-44q21-22 0-43t-43 0z m131-243q0-37 19-72 92 104 231 104 27 0 60-6-9 56-52 94t-102 37q-64 0-110-46t-46-111z m125 313v62q0 14 9 23t22 8 23-8 8-23v-62q0-14-8-23t-23-8-22 8-9 23z m230-113q-21 21 0 43l43 44q24 22 45 0t0-44l-45-43q-21-22-43 0z m82-200q0 14 9 23t22 9h63q14 0 22-9t9-23-9-22-22-9h-63q-13 0-22 9t-9 22z","horiz-adv-x":1000,"height":699.6666666666666,"width":998.3333333333334},
    "snowy": {"id":"snow","path":"M0 506q0 90 64 154t155 65q17 0 31-2 43 61 109 93 68 33 141 33t140-33q66-32 110-93 13 2 31 2 90 0 154-65t64-154-64-154-154-65q-42 0-78 14-88-76-203-76t-203 76q-37-14-78-14-90 0-155 65t-64 154z m60-392q-5 19 14 25l24 6q0 12 6 21l-18 18q-14 14 0 28 14 15 29 1l18-17q9 3 21 5l6 24q6 19 25 13t14-25l-6-23q5-3 8-6 4-5 8-10l23 8q20 3 26-16 6-19-16-25l-23-6q0-12-6-21l17-18q16-14 1-28-14-15-30-1l-16 17q-11-3-21-6l-8-23q-4-20-24-15-21 5-15 27l6 23q-7 4-16 16l-23-8q-20-3-24 16z m84 11q14-13 29 0 14 14-1 28-14 15-28 1-15-15 0-29z m204-163q3 15 15 21l35 21q-3 19 0 37l-35 20q-12 8-15 21t2 27q7 12 21 16t27-4l35-21q14 14 32 19v41q0 14 10 25t25 11 24-11 11-25v-41q17-5 31-19l35 21q14 8 28 4t20-16q7-13 3-27t-16-21l-35-20q4-18 0-37l35-21q12-6 16-21t-3-26q-7-12-21-16t-27 4l-35 20q-14-12-31-18v-41q0-15-11-25t-24-10-25 10-10 25v41q-17 6-32 18l-35-20q-13-7-27-4t-21 16q-6 12-2 26z m117 61q0-15 10-25t25-9 23 9q12 10 12 25t-11 24-24 10-25-10-10-24z m277 81q6 19 25 13l24-5q3 5 7 9 3 3 8 6l-6 24q-5 19 14 25t25-14l6-23q12-2 22-6l17 18q15 13 30-1 13-15 0-29l-18-17q6-10 6-22l23-6q20-5 15-25-5-19-24-16l-24 8q-8-12-16-15l6-24q6-21-14-26-21-6-25 14l-7 24q-13 2-22 6l-16-18q-15-14-30 1-14 14 1 29l18 17q-6 9-6 22l-24 5q-21 6-15 26z m85-41q14-14 29 0 14 13-1 27-14 16-28 1-15-15 0-28z","horiz-adv-x":1000,"height":699,"width":998.3333333333334},
    "none":{"id":"none","path":"M0,0"}
};

const iconColors = {
    "rainy": "#5c6b7a",
    "lightning":"#5c6b7a",
    "cloudy": "#5c6b7a",
    "sunny": "#fa8c00",
    "partlycloudy": "#18a1cd",
    "snowy": "#D5D8DE",
    "none":"#000"
};

const tempColorScale = chroma.scale(['#004c8f','#0973b4','#0f86c8','#30bbef','#35c8ec','yellow','#ff6b0a','red','#ce0a17']).domain([-40,40]);

// run these functions in order
async.waterfall([
    getData,
    unzipData,
    kmlToJSON,
    parseData,
    createMarkerData,
], function (err, result) {
	// remove all the data
	fs.emptyDir('./data/kml');
	fs.emptyDir('./data/kmz');
	fs.emptyDir('./data/json');
	console.log("all done");
});

function getData(callback) {

	async.eachSeries(stations, function(station, callbackEach) {

		const url = `https://opendata.dwd.de/weather/local_forecasts/mos/MOSMIX_L/single_stations/${station.id}/kml/MOSMIX_L_LATEST_${station.id}.kmz  `
		
		request.head(url, (err, res, body) => {
			request(url)
			  .pipe(fs.createWriteStream(`./data/kmz/${station.id}.zip`))
			  .on('close', callbackEach)
		});

	}, function(err) {
	    if( err ) {
	      console.log('Files failed to download');
	    } else {
	      console.log('All files have been downloaded successfully');
	      callback(null);
	    }
	});

};

function unzipData(callback) {

	async.eachSeries(stations, function(station, callbackEach) {

		const kmlStream = fs.createWriteStream(`./data/kml/${station.id}.kml`);

		fs.createReadStream(`./data/kmz/${station.id}.zip`)
			.pipe(unzipper.Parse())
			.on('entry', function (entry) {
				entry.pipe(kmlStream);
				kmlStream.on('close', function() {
					callbackEach();
					entry.autodrain();
				});
			});

	}, function(err) {
	    if( err ) {
	      console.log('Failed to unzip');
	    } else {
	      console.log('All files have been unzipped successfully');
	      callback(null);
	    }
	});

};

function kmlToJSON(callback) {

	async.eachSeries(stations, function(station, callbackEach) {

		const parser = new xml2js.Parser();
		fs.readFile(`./data/kml/${station.id}.kml`,"utf-8", function(err, data) {

		    parser.parseString(data, function (err, result) {

		    	if(err){
		    		console.log("parsing error",err);
		    	} else{
			        fs.writeFile(`./data/json/${station.id}.json`, JSON.stringify(result, null, 4), function(err){
			       		callbackEach();
				    })
		    	}

		    });
		});

	}, function(err) {
	    if( err ) {
	      console.log('JSON conversion failed')
	    } else {
	      console.log('All files have been converted to JSON');
	      callback(null);
	    }
	});

};

function parseData(callback) {

	async.eachSeries(stations, function(station, callbackEach) {

		fs.readFile(`./data/json/${station.id}.json`,'utf-8', function(err, d) {

			const data = JSON.parse(d);
			const stationName = data["kml:kml"]["kml:Document"][0]["kml:Placemark"][0]["kml:description"][0];
			const tomorrowIndexes = getTomorrowIndexes(data);

			station["maxT"] = getMaxTemp(data,"TTT", tomorrowIndexes);
			station["condition"] = getCondition(data,"ww",tomorrowIndexes);

			console.log(stationName, station["maxT"],station["condition"]);

			callbackEach()

		});

	}, function(err) {
	    if( err ) {
	      console.log('Weather conditions could not be parsed')
	    } else {
	      console.log('Weather conditions parsed');
	      callback(null);
	    }
	});

};


function createMarkerData(callback) {

	const newMarkers = {
	    "markers": []
	};

	// add the date marker
	const dateTomorrow = new Date();
	dateTomorrow.setDate(dateTomorrow.getDate() + 1);
	const dayTomorrow = dateTomorrow.getDate();
	const monthTomorrow = ("0" + (dateTomorrow.getMonth() + 1)).slice(-2);
	const yearTomorrow = dateTomorrow.getFullYear() - 2000;
	const mapDate = `${dayTomorrow}.${monthTomorrow}.${yearTomorrow}`;
	dateMarker["title"] = mapDate;
	newMarkers.markers.push(dateMarker);

	// add the place markers 
	stations.forEach((station,i) => {

		newMarkers.markers.push(newPlaceMarker(station,i));

	})

	// Germany area marker
    newMarkers.markers.push(germanyMarker);

    fs.writeFile('markerData.json', JSON.stringify(newMarkers, null, 4), function(err){
        console.log('successfully written');
        callback(null);
    })

}


function getTomorrowIndexes(data){

	const dateTomorrow = new Date();
	dateTomorrow.setDate(dateTomorrow.getDate() + 1);
	const dayTomorrow = dateTomorrow.getDate();

	const timeSteps = data["kml:kml"]["kml:Document"][0]["kml:ExtendedData"][0]["dwd:ProductDefinition"][0]["dwd:ForecastTimeSteps"][0]["dwd:TimeStep"];
	const tomorrowIndex = [];

	timeSteps.forEach((t,i) => {

		const timeStepDay =  Number(t.split("-")[2].slice(0,2));
		if(timeStepDay===dayTomorrow){
			tomorrowIndex.push(i)
		}

	})

	const minMaxIndex = [
		Math.min(...tomorrowIndex),
		Math.max(...tomorrowIndex)+ 1
	];
	
	return minMaxIndex;

}

function getMaxTemp(data,type,indexes){

	let tempData = getForcastData(data,type);
	tempData = tempData.trim().split('     ');
	let tempTomorrow = tempData.slice(...indexes);
	const tempTomorrowCelcius = tempTomorrow.map(function(d){return d-273.15});
	const maxTemp = Math.max(...tempTomorrowCelcius);
	return Math.round(maxTemp);

}

function getCondition(data,type,indexes){

	let conditions = getForcastData(data,type);
	conditions= conditions.trim().split('     ');
	let conditionsTomorrow = conditions.slice(...indexes);
	conditionsTomorrow = conditionsTomorrow.map(function(d){return d.trim().replace(".00",'')});
	let priorityCondition; 
	let priority = 10000; 
	conditionsTomorrow.forEach((c,i) => {
		if(weatherCodes[c].priority < priority){
			priority = weatherCodes[c].priority;
			priorityCondition = weatherCodes[c].type
		}
	})
	return priorityCondition

}

function getForcastData(data,key){

	const forecastData = data["kml:kml"]["kml:Document"][0]["kml:Placemark"][0]["kml:ExtendedData"][0]["dwd:Forecast"];
	let searchData;
	forecastData.forEach((d,i) => {
		if(d['$']['dwd:elementName']===key){
			searchData = d["dwd:value"][0]
		}	
	})

	return searchData;

}


const newPlaceMarker = function(station, i, newMarkers){

	const stationName = station.label;
	const markerSettings = cityMarkerSettings[stationName]
    const cityMarker = JSON.parse(JSON.stringify(defaultMarker));

    cityMarker["id"] = `m${i}`;

    const temp = station.maxT;
    cityMarker["title"]= `${stationName}\n<b style=\"color:${tempColorScale(temp).hex()};font-size:16px\">${temp}</b>`;

    cityMarker["coordinates"]= markerSettings["coordinates"];

    cityMarker["anchor"]= markerSettings["anchor"];
    cityMarker["offsetY"]= markerSettings["offsetY"];
    cityMarker["offsetX"]= markerSettings["offsetX"];

    const weatherCondition= station.condition || "none";
    cityMarker["icon"]= icons[weatherCondition];
    cityMarker["markerColor"] = iconColors[weatherCondition];

    return cityMarker;

}



