var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var crawler_util = require('../util/crawler_util.js');
var itnoodle = require('../project_modules/itnoodle.js');
var options = 
		{
			"host": "112.137.129.87",
			"path": "/congdaotao/module/dsthi_new/",
			"port": "443",
			"method": "get"
		};
/* js code for cron
function cron_job(res) {
	delay = 30000;
	res = JSON.parse(res);
	setTimeout(() => {
		if(res.ack >= res.maxStudent) res.skip = 0;
			else
				res.skip = res.ack;
		// console.log(res);
		crawl_finaltest({skip: res.skip, limit: res.limit}, cron_job);
	},
	delay);
}
function crawl_finaltest(params, callback) {
    let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
	    if (this.readyState == 4 && this.status == 200) {
	        // Typical action to be performed when the document is ready:
	        console.log(xhttp.responseText);
	        if(callback)
	        	callback(xhttp.responseText);
	    }
	};
	let url = '/finaltest?skip='+params.skip;
	if(params.limit)
		url += '&limit='+params.limit;
	console.log(url);
	xhttp.open("GET", url, true);
	xhttp.send();
}
crawl_finaltest({skip: 0, limit: 50}, cron_job)
*/
const LIMIT = 10;
router.get('/', (req, res) => {
	console.log("call finaltest crawler");
	let skip = parseInt(req.query.skip) || 0;
	let limit = parseInt(req.query.limit) || LIMIT;
	console.log("skip " + skip)
	crawler_util
	.crawl(options)
	.then((data) => {
		let $ = cheerio.load(data[0])
		let termName = $('#content h1').text().split(' ');
		console.log("termName");
		console.log(termName);
		let year = termName[termName.length-1].split('-')[0];
		let term = ((ter) => {
			if(ter=='I'||ter=='1')
				return '1';
			else if(ter=="II"||ter=='2')
				return '2';
			console.log("=================[WRONG FORMAT]===============");
		})(termName[5]);
		itnoodle.studentCol.find({year: year, term: term}, {'skip': skip}, (err, results) => {
			results.toArray((err, stds) => {
				if(err) {
					console.log("convert student to array error: " + err);
					return;
				}
				res.json({maxStudent: skip+stds.length, ack: skip+limit, limit: limit});
				stds = stds.slice(0, limit);
				stds.forEach((std, idx) => {
					let options = {
						"host": "112.137.129.87",
						"path": "/congdaotao/module/dsthi_new/index.php?r=lopmonhoc/napmonthi",
						"port": "443",
						"method": "post",
						headers: {
                        	"Content-Type": "application/x-www-form-urlencoded"
                        }
					};
					crawler_util
					.crawl(options, {keysearch: std.code})
					.then((data) => {
						console.log("std_seq: " + idx + " student " + std.code + " " + std.fullname);
						let $ = cheerio.load(data[0]);
						let students = {};
						/*
						[ '1',
					    '13020713',
					    'Nguyễn Đức Hoàng',
					    '26/12/1994',
					    'QH-2013-I/CQ-C-B',
					    '12',
					    'ELT3047 1',
					    'Kiến trúc máy tính',
					    '5/6/2018',
					    '14:00',
					    '2',
					    '3-G3',
					    'Nhà G3',
					    'Viết' ],
						*/
						let push_finaltest = function(students, ft) {
							if(!students.hasOwnProperty(ft[1])) {
								students[ft[1]] = {
									code: ft[1],
									year: year,
									term: term,
									finaltests: {},
								}
							}
							let finaltest = {
								code: ft[6].split(' ').join('').toLowerCase(),
								name: ft[7],
								seat_no: ft[5],
								day: ft[8],
								time: ft[9],
								shift: ft[10],
								room: ft[11],
								building: ft[12],
								type: ft[13],
							}
							students[ft[1]]['finaltests'][finaltest['code']] = finaltest;
						};
						// console.log(data[0]);
						$('table.items tbody tr').each((row_idx, row) =>
					    {
					        let ftest = [];
					        $('td', row).each((col_idx, col) =>
					        {
					            ftest.push($(col).text().trim() || "");
					        });
					        // console.log(`row ${row_idx} ${JSON.stringify(ftest)}`);
					        push_finaltest(students, ftest);
					    });
					    Object.keys(students).forEach((code) => {
					    	if(!std.finaltests||JSON.stringify(students[code].finaltests)!=JSON.stringify(std.finaltests)) {
					    		console.log("Update student " + std.code + " " + std.fullname);
					    		itnoodle.studentCol
					    		.update({_id: std._id}, {$set: {finaltests: students[code].finaltests}});
					    	}
					    });
					    // console.log(std);
					});				
				});
			});
		});
	});
});

module.exports = router;