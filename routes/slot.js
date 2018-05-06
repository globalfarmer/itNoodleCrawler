var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var querystring = require('querystring');
var crawler_util = require('../util/crawler_util.js');
var crypto = require('crypto');
var itnoodle = require('../project_modules/itnoodle.js');
var options = 
		{
			"host": "112.137.129.87",
			"port": "443",
			"path": "/congdaotao/module/qldt/",
			"method": "GET"
		};
const MAX_SIZE = 5;
router.get('/', (req, res) => {
	console.log("call slot crawler");
	crawler_util
	.crawl(options)
	.then((data) => {
		// console.log(data);
		let $ = cheerio.load(data[0]);
		// terms is an array of [termCode, termName] (e.g [ '024', 'Học kỳ 2 năm học 2017-2018' ])
		let terms = [];
		$("#SinhvienLmh_term_id option").each((idx, el) => {
			terms.push([$(el).attr('value'), $(el).text()]);
		});
		terms = terms.slice(1);
		console.log(terms);
		terms.forEach((el, idx) => {
			let options = 
			{
				"host": "112.137.129.87",
				"port": "443",
				"path": "/congdaotao/module/qldt/",
				"method": "GET"
			};
			let params =  
			{
				'SinhvienLmh[term_id]': el[0],
                'SinhvienLmh_page': 1,
                'pageSize': MAX_SIZE
            };
            // [ '024'<termCode>, 'Học kỳ 2<term> năm học 2017<year>-2018' ]
            let termName = el[1].split(' ');
            let newSlotDoc = {
            	termCode: el[0],
            	year: termName[termName.length-1].split('-')[0],
            	term: termName[2]
            }
            itnoodle.slotCol.findOne(newSlotDoc).then((slotDoc) => {
            	console.log("Slot document: ");
	            console.log(slotDoc);
	            options.path = '/congdaotao/module/qldt/index.php?r=sinhvienLmh/admin&' + querystring.stringify(params);
				crawler_util
				.crawl(options)
				.then((data) => {
					console.log(data[1]);
					// Save new version of data
					crawler_util.save_file('./data', [newSlotDoc.year,newSlotDoc.term, data[1]], data[0], {checkExist: 1});
					if( !slotDoc || slotDoc.hashCode != data[1] ) {
						// Update new hash of new version of data into database
						if(!slotDoc) {
							newSlotDoc.hashCode = data[1];
							itnoodle.slotCol.insert(newSlotDoc);
						}
						else							
							itnoodle.slotCol.updateOne({newSlotDoc}, {$set: {hashCode: data[1]}})
						// Update student document
					}
				})
				.catch((e) => console.log(e));
            })
		});
	})
	.catch((e) => console.log(e));
	res.sendStatus(200);
})

module.exports = router;