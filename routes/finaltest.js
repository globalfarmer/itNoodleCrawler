var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var crawler_util = require('../util/crawler_util.js');
var itnoodle = require('../project_modules/itnoodle.js');
var itparser = require('../util/parser.js');
var options = 
		{
			"host": "112.137.129.87",
			"path": "/congdaotao/module/dsthi_new/",
			"port": "443",
			"method": "get"
		};
const LIMIT = 45;
const DELAY_TIME = 30000;
function bulk_crawl(stds, cnt, year, term) {
	let idx = cnt * LIMIT;
	let right = Math.min(stds.length, idx+LIMIT);
	console.log("crawl from  " + idx + " to right before " + right);
	for(; idx < right; idx++) {
		let std = stds[idx];
		let index = idx;
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
			console.log("std_seq: " + index + " student " + std.code + " " + std.fullname);
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
					day: itparser.uet_date(ft[8]),
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
		    		.updateOne({_id: std._id}, {$set: {finaltests: students[code].finaltests}});
		    	}
		    });
		    // console.log(std);
		});				
	};
	if(right < stds.length)
		setTimeout(() => {bulk_crawl(stds, cnt+1, year, term)}, DELAY_TIME);
}
router.get('/', (req, res) => {
	console.log("call finaltest crawler");
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
		itnoodle.studentCol.find({year: year, term: term}, (err, results) => {
			results.toArray((err, stds) => {
				if(err) {
					console.log("convert student to array error: " + err);
					return;
				}
				console.log("number of students " + stds.length);
				bulk_crawl(stds, 0, year, term);
			});
		});
	});
	res.sendStatus(200);
});

module.exports = router;