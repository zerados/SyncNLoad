//individual methods have further descriptions if needed otherwise this have been done as a group
var server = require('http').createServer()
	, url = require('url')
	, WebSocketServer = require('ws').Server
	, wss = new WebSocketServer({ server: server })
	, express = require('express')
	, app = express()
	, port = process.env.PORT || 5600;


var mongodb = require('mongodb').MongoClient;
var config = require('./config');
var https = require('https');

//variables
var clientsWaitingForUpdate = [];
var videoPlaylist = [];
var controlClient = null;
var database = config.dbUrl;
init();
//static content
app.use('/static', express.static('static'))
//functions
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});
app.get('/video/archive', function (req, res) {
	mongodb.connect(database, function (err, db) {
		var collection = db.collection('addedVideos');
		collection.find({$or: [{'status' : 'played'}, {'status' : 'deleted'}]}).toArray(function (err, result) {
			videoPlaylist = result;
			db.close();
			res.json(result);
		});
	});
})
app.get('/video/:index', function (req, res, next) {
	res.json(videoPlaylist[req.params.index]);
	next();
})

app.get('/videos', function (req, res, next) {
	res.json(videoPlaylist);
	next()
})
//Made by Eric and Gordon
//Morten Modified late in the process
app.delete('/video/:index', function (req, res) {
	var success = false;
	var videoToBeRemoved = videoPlaylist[req.params.index];

	videoPlaylist.splice(videoToBeRemoved, 1);
	var status = {"status" : "deleted"};
	console.log("DOING STUPID SHIT : " + req.params.index)
	if(req.params.index === "0"){
		status.status = "played";
	}
	mongodb.connect(database, function (err, db) {
		var collection = db.collection('addedVideos');

		collection.updateOne({"_id" : videoToBeRemoved._id}, {$set : status}, function (err, result) {
			console.log("Deleted the following object in the database: " + JSON.stringify(result));
			db.close();
		});
	});
	if (videoToBeRemoved !== videoPlaylist[req.params.id]) {
		//statuscode for successful deletion...
		res.status(200).send();
	} else {
		//statuscode for failure...
		res.status(404).send();
	}
})
//Coded by Eric And Morten
app.delete('/videos', function (req, res) {

	mongodb.connect(database, function (err, db) {
		var collection = db.collection('addedVideos');

		collection.updateMany({"status" : "unPlayed"}, {$set: {"status" : "deleted"}}, {multi : true}, function (err, result) {
			console.log("deleted: " + JSON.stringify(result));
			db.close();
		});
	});

	videoPlaylist = [];
	if (videoPlaylist.length === 0) {
		//statuscode for successful deletion...
		res.status(200).send();
	} else {
		//statuscode for failure...
		res.status(500).send();
	}
})
//Eric and gordon did the implenentation
//Morten helped modify after intiial implenetation
app.post('/video/:id', function (req, res, next) {
	var url = 'https://www.googleapis.com/youtube/v3/videos?id=' +
		req.params.id +
		'&key=AIzaSyD5r6DidTnUh1vfhNJ8uLA5J1ZB0RfSoGc%20&' +
		'part=snippet,contentDetails,statistics,status,topicDetails,player';

	download(url, function (data) {
		var jsonData = JSON.parse(data); //parse the data to a object.
		//check video duration.
		if (validDuration(jsonData.items[0].contentDetails.duration)) {
			//create videoObject.
			videoObject = {
				"title" : jsonData.items[0].snippet.title,
				"id" : jsonData.items[0].id,
				"description" : jsonData.items[0].snippet.description,
				"player" : jsonData.items[0].player.embedHtml,
				"duration" : jsonData.items[0].contentDetails.duration,
				"url" : "https://www.youtube.com/watch?v=" + jsonData.items[0].id,
				"status" : "unPlayed"
			}

			//save object in the database & add it to the playlist array.
			mongodb.connect(database, function (err, db) {
				var collection = db.collection('addedVideos');

				collection.insert(videoObject, function (err, result) {
					console.log("Logged the following object in the database: " + JSON.stringify(result.ops[0]));
					videoPlaylist.push(result.ops[0]);
					db.close();
				});
			});

			//respond with a statuscode
			res.status(201).send();
		} else {
			res.status(400).send();
		}
		next();
	})
})
//Morten
wss.broadcast = function broadcast(data, messageClient) {
	wss.clients.forEach(function each(client) {
		if(messageClient != client){
			client.send(data);
		}

	});
};

//Morten
wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		var message = JSON.parse(message);
		//checks for the command to take  control or surrender it
		if(message.command === "changeControl"){
			//gives up control if client = server held varriable
			if(controlClient === ws){
				controlClient = null;
				ws.send(JSON.stringify({"command" : "changeControl", "control" : false}))
			}
			//takes control if the server side held control is null
			else if(controlClient === null){
				controlClient = ws;
				ws.send(JSON.stringify({"command" : "changeControl", "control" : true}))
			}
		} else if(message.command === "join"){
			if(controlClient !== null){
				try{
					clientsWaitingForUpdate.push(ws);
					controlClient.send(JSON.stringify({"command" : "join"}))
				} catch(err){
					controlClient = null;
					console.log(err)
				}

			}

		} else if(message.command === "update"){
			if(clientsWaitingForUpdate.length > 0){
				clientsWaitingForUpdate.forEach(function each(client){
					client.send(JSON.stringify(message));
					console.log("trying to update joining clients")
				})
				clientsWaitingForUpdate =[];
			}
		}
		else{
			//normal broadcasts only broadcasts if user have control
			//TODO: use same server for chat this needs to be changed
			if(ws === controlClient){
				wss.broadcast(JSON.stringify(message), ws);
			}
		}

	});
});

function download(url, callback) {
	https.get(url, function(res) {
		var data = "";
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			callback(data);
		});
	}).on('error', function() {
		callback();
	});
};
//heavily influenced by stackoverflow implenented by Eric, Morten
function validDuration(duration) {
	var reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
	var hours = 0, minutes = 0, seconds = 0, totalInSeconds;
	var maxDurationInSeconds = 1800;

	if (reptms.test(duration)) {
		var matches = reptms.exec(duration);
		if (matches[1]) hours = Number(matches[1]);
		if (matches[2]) minutes = Number(matches[2]);
		if (matches[3]) seconds = Number(matches[3]);
		totalInSeconds = hours * 3600  + minutes * 60 + seconds;
		if (totalInSeconds < maxDurationInSeconds) {
			return true;
		}
	}
	return false;

	/*
	 var maxDurationInSeconds = 60 * 30;
	 var hIndex;
	 var mIndex;
	 var sIndex;

	 var videoDuration = 0;

	 if (videoObjectArg.duration.indexOf("H")) {
	 videoDuration = videoObjectArg.duration
	 }
	 */
}
//function to be run when server starts
//Morten
function init(){
	mongodb.connect(database, function (err, db) {
		var collection = db.collection('addedVideos');

		collection.find({"status" : "unPlayed"}).toArray(function (err, result) {
			videoPlaylist = result;
			db.close();
		});
	});
}
server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port) });
