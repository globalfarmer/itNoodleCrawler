var querystring = require('querystring'),
	http = require('http'),
	https = require('https');
module.exports = {
	crawl: function(options, params) {
        var timeLabel = 'crawl_' + (new Date()).getTime();
        console.log(options);
        console.time(timeLabel);
        return new Promise((resolve, reject) => {
            var htmlContent = "";
            var pro = options.port == 443 ? https : http;
            var req = pro.request(options, (res) => {
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    htmlContent += chunk;
                });
                res.on('end', () => {
                    console.timeEnd(timeLabel);
                    resolve(htmlContent);
                });
            });
            if(options.method.toLowerCase() === 'post' )
                req.write(querystring.stringify(params));
            req.end();
        })
    }
}