var express = require('express');
var router = express.Router();
var http = require('http');
var querystring = require('querystring');
var crawler_util = require('../util/crawler_util.js');
var cheerio = require('cheerio');
var itnoodle = require('../project_modules/itnoodle.js');
const localOffset = (new Date()).getTimezoneOffset();
const GMT7Offset = -420;
var uet_time_parser = function(date, time) {
	date = date.split(/[-/]/);
	if(!time)
		date = new Date(date[0], parseInt(date[1])-1, parseInt(date[2]), 0, (GMT7Offset-localOffset), 0);
	else {
		time = time.split(/:/);
		date = new Date(date[0], parseInt(date[1])-1, parseInt(date[2]), time[0], (GMT7Offset-localOffset)+time[1], time[2]);
	}
	return date;
}
var scoreboard_download_file = crawler_util.scoreboard_download_file();
scoreboard_download_file.download();
router.get('/', (req, res) => {
	console.log("call scoreboard crawler");
	res.sendStatus(200);
	let htmlContent = "";
	http.request('http://112.137.129.30/viewgrade/', (res)=>{
		res.setEncoding('utf8');
    	res.on('data', (chunk) => {
        	htmlContent += chunk;
    	});
    	res.on('end', () => {
    		let cookies = [];
    		res.headers['set-cookie'].forEach((coo) => {
    			cookies.push(coo.split(';')[0]);
    		})
    		cookies = cookies.join(';');
    		console.log(res.headers);
    		console.log(cookies);
    		let $ = cheerio.load(htmlContent);
    		let _token = $('input[name=_token]').attr('value');
    		let params = {_token: _token};
    		console.log(params);
    		// return;
    		let options = {
    			'host': '112.137.129.30',
    			'path': '/viewgrade/home/getListYearTerm',
    			'method': 'post',
    			'port': '80',
    			'headers': {
    				'Content-Length': Buffer.byteLength(querystring.stringify(params)),
    				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    				'Cookie': cookies
    			}
    		};
    		crawler_util
    		.crawl(options, params)
    		.then((data) => {
    			data[0] = JSON.parse(data[0]);
    			console.log(data);
    			itnoodle.listyearCol.findOne({hashCode: data[1]}).then((listyear) => {
    				if(!listyear)
    					itnoodle.listyearCol.insert({hashCode: data[1], content: data[0]});
    			});
    			let year;
    			data[0][0].forEach((y) => {
    				if(y[0]==data[0][2])
    					year = y;
    			})
    			if(!year) {
    				console.log("--------------ERROR NO YEAR");
    				return;
    			}
    			// TODO all term
    			data[0][3].forEach((term_val) => {
					[0, 1].forEach((type_education) => {
	    				let prms = {
	    					_token: _token,
	    					term: term_val[0],
	    					type_education: type_education
	    				}
	    				let opts = {
		    				'host': '112.137.129.30',
			    			'path': '/viewgrade/home/getListSubjectOfTerm',
			    			'method': 'post',
			    			'port': '80',
			    			'headers': {
			    				'Content-Length': Buffer.byteLength(querystring.stringify(prms)),
			    				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			    				'Cookie': cookies
			    			}	
	    				}
	    				crawler_util
	    				.crawl(opts, prms)
	    				.then( (data) => {
	    					console.log("---- term ");
    						console.log(term_val);
							console.log("----- type education");
							console.log(type_education);
	    					data[0] = JSON.parse(data[0]);
	    					// console.log(JSON.stringify(data[0]));
	    					// console.log(data[0].length);
	    					data[0][0].forEach((sb)=>{
	    						let sboard = {};
	    						sboard.req_term = term_val[0];
	    						sboard.req_year = year[0];
	    						sboard.term_name = term_val[1];
	    						sboard.year_name = year[1];
	    						sboard.year = year[1].split('-')[0];
	    						sboard.type_edu = type_education;
	    						if(term_val[1].toLowerCase().split(" ").join("")=="họckỳ1")
	    							sboard.term = "1";
	    						else if(term_val[1].toLowerCase().split(" ").join("")=="họckỳ2")
	    							sboard.term = "2";
	    						else 
	    							console.log("NEITHER HOC_KY_1 or HOC_KY_2");
	    						sboard.course = {
	    							name: sb[0],
	    							code: sb[1].split(" ").join("").toLowerCase()
	    						}
	    						if(sb[2]) {
	    							sboard.course.src = [opts.host,opts.path.split('/')[1],sb[2]].join('/');
	    							sboard.course.uploadtime = uet_time_parser(sb[3].split(' ')[0], sb[3].split(' ')[1]);
	    							scoreboard_download_file.push(['./data', sb[2].split('/'), sboard.course.src, {checkExist: 1}]);
	    						}
	    						itnoodle.scoreboardCol.findOne({
	    							req_term: sboard.req_term,
	    							req_year: sboard.req_year,
	    							term_name: sboard.term_name,
	    							year_name: sboard.year_name,
	    							'course.code': sboard.course.code,
	    							type_edu: sboard.type_edu
	    						}).then((doc) => {
	    							if(!doc) {
	    								console.log("---------INSERT scoreboard:")
	    								console.log(sboard.course.name + " " + sboard.course.code);
	    								itnoodle.scoreboardCol.insert(sboard);
	    							}
	    							else if(!doc.course.src&&sboard.course.src) {
	    								console.log("---------UPDATE scoreboard:")
	    								console.log(sboard.course.name + " " + sboard.course.code);
	    								itnoodle.scoreboardCol.update({_id: doc._id}, {$set: sboard});
	    							}
	    						});
	    					});
	    				})
	    			});
    			})
    		});
    	});
	}).end();
})

module.exports = router;