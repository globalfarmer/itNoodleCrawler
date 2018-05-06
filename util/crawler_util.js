var querystring = require('querystring'),
	http = require('http'),
	https = require('https'),
	crypto = require('crypto');
module.exports = {
	crawl: function(options, params) {
        let timeLabel = 'crawl_' + (new Date()).getTime();
        console.log(options);
        console.time(timeLabel);
        let md5sum = crypto.createHash('md5');
        return new Promise((resolve, reject) => {
            let htmlContent = "";
            let pro = options.port == 443 ? https : http;
            let req = pro.request(options, (res) => {
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    htmlContent += chunk;
                    md5sum.update(chunk);
                });
                res.on('end', () => {
                    console.timeEnd(timeLabel);
                    resolve([htmlContent, md5sum.digest('hex')]);
                });
            });
            if(options.method.toLowerCase() === 'post' )
                req.write(querystring.stringify(params));
            req.end();
        })
    }
}