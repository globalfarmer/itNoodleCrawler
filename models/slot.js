var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
	year: String,
	term: String,
	termcode: String,
	hashcode: String
});