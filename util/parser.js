const localOffset = (new Date()).getTimezoneOffset();
const GMT7Offset = -420;
module.exports = {
	uet_date: function(date) {
		if(typeof(date)=='string') {
			date = date.split('/');
			date = new Date(date[2], parseInt(date[1])-1, parseInt(date[0]), 0, (GMT7Offset-localOffset), 0);
		}
		return date;
	}
}