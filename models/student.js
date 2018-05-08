var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
	code: String,
	fullname: String,
	birthday: String,
	klass: String,
	year: String,
	term: String,
	// a map of <course_code<String>, {code: String, name: String, credit:String, group: String, note: String}>
	slots: {}, 
	// a map of <course_code<String>, 
	// {code: String, name: String, seat_no: String, day: String, time: String, shift: String, room: String, building: String, type:String } >
	finaltest: {}
});