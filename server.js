var express = require('express');
var server = express();
var https = require('https');


//variables
var videoPlaylist = [];


//functions


server.get('/video/:index', function (req, res) {
	res.json(videoPlaylist[req.params.index]);
})

server.get('/videos', function (req, res) {
	res.json(videoPlaylist);
})

server.post('/video/:id', function (req, res) {
	var url = 'https://www.googleapis.com/youtube/v3/videos?id=' +
	req.params.id +
	'&key=AIzaSyD5r6DidTnUh1vfhNJ8uLA5J1ZB0RfSoGc%20&' + 
	'part=snippet,contentDetails,statistics,status,topicDetails,player';

	download(url, function (data) {
		var jsonData = JSON.parse(data); //parse the data to a object.
		//check video duration
		if (validDuration(jsonData.items[0].contentDetails.duration)) {
			//create videoObject
			videoObject = {
				title : jsonData.items[0].snippet.title,
				description : jsonData.items[0].snippet.description,
				player : jsonData.items[0].player.embedHtml,
				duration : jsonData.items[0].contentDetails.duration,
				url : "https://www.youtube.com/watch?v=" + jsonData.items[0].id
			}
			videoPlaylist.push(videoObject);
			res.status(201).send();
		} else {
			res.status(400).send();
		}
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


function validDuration(duration) {
	var reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
        var hours = 0, minutes = 0, seconds = 0, totalseconds;
        var maxDurationInSeconds = 1800;

        if (reptms.test(duration)) {
          	var matches = reptms.exec(duration);
            if (matches[1]) hours = Number(matches[1]);
            if (matches[2]) minutes = Number(matches[2]);
            if (matches[3]) seconds = Number(matches[3]);
            totalseconds = hours * 3600  + minutes * 60 + seconds;
        	if (totalseconds < maxDurationInSeconds) {
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