/*
	Project: itNoodle
	Author: globalfarmer
	Description: 
		This module contain some common work of every slot include connect database
*/

var express = require("express"),
	bodyParser = require('body-parser'),
	app = express(),
	it_parser = require('./util/parser.js');

var itnoodle = require('./project_modules/itnoodle.js');
var	MongoClient = require('mongodb').MongoClient;
var config = require('./config/config.json');

var finaltest = require('./routes/finaltest'),
	slot = require('./routes/slot'),
	scoreboard = require('./routes/scoreboard'),
	announce = require('./routes/announce');


//public file
app.use(express.static(__dirname + '/public'));

// parse application/json
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, res, next) => {
	console.log('Request: ' + req.url);
	next();
})

//route
app.use('/finaltest', finaltest);
app.use('/slot', slot);
app.use('/scoreboard', scoreboard);
app.use('/announce', announce);

MongoClient.connect(config.db.host, function(err, client) {
	if(err)
		console.log('MongoClient default connection error: ' + err);
	else {
		console.log('MongoClient default connection open to ' + config.db.host);
		// console.log(db.collection('slot').find());
		itnoodle.db = client.db(config.db.dbname);
		itnoodle.slotCol = itnoodle.db.collection('slot');
		itnoodle.studentCol = itnoodle.db.collection('student');
		let bulk = itnoodle.studentCol.initializeUnorderedBulkOp();
		itnoodle.studentCol.find().toArray((err, stds) => {
			let str_to_date = function(str) {
				if(typeof(str) == 'string')
					str = it_parser.uet_date(str);
				return str;
			}
			stds.forEach((std) => {
				std.birthday = str_to_date(std.birthday);
				if(std.finaltests)
					Object.keys(std.finaltests).forEach((code) => {
						std.finaltests[code].day = 
							str_to_date(std.finaltests[code].day);
					})
				bulk.find({_id: std._id}).updateOne({$set: std});
			});
			console.log(bulk.length);
			if(bulk.length > 0)
				bulk.execute();
		});
		var server = app.listen(8080, () => {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
			console.log('Server started on port ' + 8080);
		});
	}
});