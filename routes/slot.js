var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var cheerio = require('cheerio');
var querystring = require('querystring');
var crawler_util = require('../util/crawler_util.js');
var options = 
		{
			"host": "112.137.129.87",
			"port": "443",
			"path": "/congdaotao/module/qldt/",
			"method": "GET"
		};
const MAX_SIZE = 10;

router.get('/', (req, res) => {
	console.log("call slot crawler");
	crawler_util
	.crawl(options)
	.then((data) => {
		// console.log(data);
		var $ = cheerio.load(data);
		var terms = [];
		$("#SinhvienLmh_term_id option").each((idx, el) => {
			terms.push([$(el).attr('value'), $(el).text()]);
		});
		terms = terms.slice(1);
		console.log(terms);
		terms.forEach((el, idx) => {
			params =  
			{
				'SinhvienLmh[term_id]': el[0],
                'SinhvienLmh_page': 1,
                'pageSize': MAX_SIZE
            };
            options.path = '/congdaotao/module/qldt/index.php?r=sinhvienLmh/admin&' + querystring.stringify(params);
			crawler_util
			.crawl(options)
			.then((data) => {
				console.log(data)
			})
			.catch((e) => console.log(e));
		});
	})
	.catch((e) => console.log(e));
	res.sendStatus(200);
})

module.exports = router;