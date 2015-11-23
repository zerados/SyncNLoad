var express = require('express');
var server = express();
var https = require('https');


//variables
var videoObject;



//functions
server.get('/:id', function (req, res) {
	var url = 'https://www.googleapis.com/youtube/v3/videos?id=' +
	req.params.id +
	'&key=AIzaSyD5r6DidTnUh1vfhNJ8uLA5J1ZB0RfSoGc%20&' + 
	'part=snippet,contentDetails,statistics,status,topicDetails,player';

	download(url, function (data) {
		// see this for more information about the page: 	https://www.googleapis.com/youtube/v3/videos?id=cAiBZyTIKV4&key=AIzaSyD5r6DidTnUh1vfhNJ8uLA5J1ZB0RfSoGc%20&part=snippet,contentDetails,statistics,status,topicDetails,player
		var jsonData = JSON.parse(data); //parse the data to a Json-object
		res.send('<br> <h1>' + jsonData.items[0].snippet.title + ' </h1> <br>' + jsonData.items[0].player.embedHtml + '<br>' + jsonData.items[0].snippet.description);



		//create videoObject
		videoObject = {
			title : jsonData.items[0].snippet.title,
			description : jsonData.items[0].snippet.description,
			player : jsonData.items[0].player.embedHtml,
			duration : jsonData.items[0].contentDetails.duration.substring(2),
			url : "https://www.youtube.com/watch?v=" + jsonData.items[0].id
		}

		/*
		console.log("title: " + videoObject.title +
			"\ndescription: " + videoObject.description +
			"\nduration: " + videoObject.duration +
			"\nurl: " + videoObject.url);
		*/

		console.log(videoObject);
	})
})

server.listen(5600);

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