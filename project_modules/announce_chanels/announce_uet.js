var crawler_util = require('../../util/crawler_util.js');
var itnoodle = require('../../project_modules/itnoodle.js');
var parser = require('../../util/parser.js');
var https = require('https');
var cheerio = require('cheerio');
var optionsArr = (function(startPage, endPage) {
	let results = [];
	let options;
	for(i=startPage;i<endPage;i++) {
		options = {
			"host": "uet.vnu.edu.vn",
			"method": "get",
			"port": "443"
		};
		options.path = "/category/tin-tuc/tin-sinh-vien/" + (i==1?"":["page/",i,"/"].join(""));
		results.push(options);		
	}
	return results;
})(1, 3);
function bulk_job(optionsArr, curIndex) {
	console.log("------------------------------- curIndex " + curIndex );
	if(curIndex >= optionsArr.length)
		return;
	let options = optionsArr[curIndex];
	crawler_util
	.crawl(options)
	.then((data) => {
        let $ = cheerio.load(data[0]);
		$('div.blog-post-item').each((idx, post) => {
			let announce = {};
			announce.thumbail_img = $('div.item-thumbnail img').attr('src');
			let item_content = $('div.item-content', post);
			announce.title = $('h3 a', item_content).text().trim();
			announce.url = $('h3 a', item_content).attr('href');
			announce.excerpt = $('div.blog-item-excerpt p', item_content).text().trim();
			let htmlContent = "";
			https.request(announce.url, (res) => {
				res.setEncoding('utf8');
            	res.on('data', (chunk) => {
                	htmlContent += chunk;
            	});
            	res.on('end', () => {
            		let detail = cheerio.load(htmlContent);
            		detail('span.sep').remove();
            		detail('span.dot').remove();
            		let spans = detail('.item-meta span');
            		announce.poster = detail(spans[0]).text().trim();
            		announce.uploadtime = parser.uet_date(detail(spans[1]).text().trim());
            		// announce.views = detail(spans[4]).text().trim();
            		announce.category = [];
            		detail('a',spans[2]).each((i, el) => {announce.category.push(detail(el).text().trim())})
					// console.log(announce);
					console.log(announce.title);
					itnoodle.announceCol.findOne({url: announce.url}).then((ann) => {
						if(!ann) {
							console.log("insert announce " + announce.url);
							itnoodle.announceCol.insert(announce);
						}
						else {
							console.log("announce is exist " + announce.url);
							if(ann.title != announce.title) {
								itnoodle.announceCol.updateOne({_id: ann._id}, {$set: {title: announce.title}});
							}
						}
					})
            	});
			}).end();
		})
	})
	if(curIndex%5==4)
		setTimeout(() => {bulk_job(optionsArr, curIndex+1)}, 15000);
	else
		bulk_job(optionsArr, curIndex+1);
};
module.exports = {
	start: function() {
		bulk_job(optionsArr, 0);
	}
}