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
const MAX_SIZE = 50000;
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
					}
					// Update student document
					// ---- Parse
					console.log("Parse phrase");
					let items = [];
					let students = {};
					let push_slot = function(students, slot) {
						if(!students.hasOwnProperty(slot[1])) {
							students[slot[1]] = {
								code: slot[1],
								fullname: slot[2],
								birthday: slot[3],
								klass: slot[4],
								year: newSlotDoc.year,
								term: newSlotDoc.term,
								slots: {}
							}
						}
						let course = {
							code: slot[5].split(' ').join('').toLowerCase(),
							name: slot[6],
							credit: slot[8],
							group: slot[7],
							note: slot[9]
						}
						students[slot[1]]['slots'][course['code']] = course;
					}
					console.time('slot_parse');
					let $ = cheerio.load(data[0]);
					let tables = $('table.items');
					/*
					[ '1',
				    '13020002','Cao Vũ Việt Anh','23/10/1995','QH-2013-I/CQ-C-B','INT3307 1',
				    'An toàn và an ninh mạng','CL','3','ĐK lần đầu','023' ]
				    */
					// console.log(tables);
					if( tables.length === 1) {
						$('tr',tables).each( (row_idx, row) => {
							if( row_idx < 2)
								return;
							let slot = [];
							$('td', row).each( (col_idx, col) => {
						    	// console.log(`    col ${$(col).text()}`);
								slot.push($(col).text().trim() || "");
						  	});
							// console.log(slot);
							// items.push(slot);
							push_slot(students, slot);
						});
						// console.log(items);
						// console.log(`number of slots ${items.length}`);
						console.log(`number of students ${Object.keys(students).length}`);
					}
					else
					{
						console.log("[SLOTCRAWLER] parse: have no table.items or more than one");
					}
					console.timeEnd('slot_parse');
					// ----- Parse student
					// console.time('slot_parse_student');
					// console.timeEnd('slot_parse_student');
					// ------ save to db
					itnoodle.studentCol.find({year: newSlotDoc.year, term: newSlotDoc.term}, (err, cursor) => {
						cursor.toArray((err, stds) => {
							let changed_students = {};
							if(!stds) stds = [];
							console.log('number of students in db ' + stds.length);
							stds.forEach((std) => {
								if(students[std.code]) {
									if(JSON.stringify(students[std.code].slots)!=JSON.stringify(std.slots)) {
										changed_students[std.code] = students[std.code];
										changed_students['_id'] = std['_id'];
									}
								}
								delete students[std.code];	
							});
							console.log("inserted students " + Object.keys(students).length);
							// insert students
							let bulk = itnoodle.studentCol.initializeUnorderedBulkOp();
							Object.keys(students).forEach((code) => {
								bulk.insert(students[code]);
							});
							// update students
							Object.keys(changed_students).forEach((code) => {
								bulk
								.find({_id: changed_students[code]['_id']})
								.update({$set: {slots: changed_students[code]['slots']}});
							});
							if(bulk.length > 0)
								bulk.execute();
							// console.log(changed_students);
						})

					})
				})
				.catch((e) => console.log(e));
            })
		});
	})
	.catch((e) => console.log(e));
	res.sendStatus(200);
})

module.exports = router;