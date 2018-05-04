/*
	Project: itNoodle
	Author: globalfarmer
	Description: 
		This module contain some common work of every slot include connect database
*/

var express = require("express"),
	mongoose = require('mongoose'),
	bodyParser = require('body-parser'),
	app = express();

var finaltest = require('./routes/finaltest'),
	slot = require('./routes/slot'),
	scoreboard = require('./routes/scoreboard'),
	announce = require('./routes/announce');

var config = require('./config/config.json')

//mongoose
mongoose.connect(config.db.host);

mongoose.connection.on('connected', function () {  
  console.log('Mongoose default connection open to ' + config.db.host);
}); 

mongoose.connection.on('error',function (err) {  
  console.log('Mongoose default connection error: ' + err);
}); 

mongoose.connection.on('disconnected', function () {  
  console.log('Mongoose default connection disconnected'); 
});
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

var server = app.listen(8080, () => {
  	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	console.log('Server started on port ' + 8080);
});