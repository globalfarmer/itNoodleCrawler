var querystring = require('querystring'),
	http = require('http'),
	https = require('https'),
	crypto = require('crypto'),
    path = require('path'),
    fs = require('fs');
module.exports = {
	crawl: function(options, params) {
        let timeLabel = 'crawl_' + (new Date()).getTime();
        console.log('options ' + JSON.stringify(options));
        if(params)
            console.log('params ' + JSON.stringify(params));
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
    },
    save_file: function(dirRoot, filename, data, options) {
        if(typeof(filename)==='object') {
            let dir = dirRoot;
            for(i = 0; i < filename.length-1; i++) {
                dir = path.join(dir, filename[i]);
                console.log(dir);
                if(!fs.existsSync(dir))
                    fs.mkdirSync(dir);
            }
            let fname = path.join(dir, filename[filename.length-1]);
            console.log('fname ' + fname);
            if(options.checkExist==1 && fs.existsSync(fname))
                return;
            let tmpFilename = path.join(dir, [['tmp', (new Date()).getTime()].join(''),filename[filename.length-1]].join('_'));
            console.log('tmpFilneame ' + tmpFilename);
            fs.writeFileSync(tmpFilename, data);
            fs.renameSync(tmpFilename, fname);
        }
        else { // typeof(filename) == 'string'
        }
    },
    save_scoreboard: function(dirRoot, filename, url, options) {
        console.log("save scoreboard: ");
        console.log(filename);
        console.log(url);
        let dir = dirRoot;
            for(i = 0; i < filename.length-1; i++) {
                dir = path.join(dir, filename[i]);
                console.log(dir);
                if(!fs.existsSync(dir))
                    fs.mkdirSync(dir);
            }
        let fname = path.join(dir, filename[filename.length-1]);
        console.log('fname ' + fname);
        if(options.checkExist==1 && fs.existsSync(fname))
                return;
        let tmpFilename = path.join(dir, ['tmp',filename[filename.length-1]].join('_'));
        console.log('tmpFilneame ' + tmpFilename);
        let file = fs.createWriteStream(tmpFilename);;
        http.get("http://"+url, (res) => {
          res.pipe(file);
          res.on('end', () => {
            console.log(`have downloaded successfully ${tmpFilename} ${res.statusCode} ${typeof(res.statusCode)}`);
            if( res.statusCode == 200) {
                fs.renameSync(tmpFilename, fname);       
            }
          });
        }).on('error', (err) => {
          logger.error(err);
        });
    },
    scoreboard_download_file: function() {
        let save_scoreboard = this.save_scoreboard;
        return {
            queue: [],
            DELAY_TIME: 15000,
            download: function() {
                console.log("----------- NEW BULK DOAWNLOAD---------");
                let bulk = this.queue.slice(0, 10);
                this.queue = this.queue.slice(10);
                bulk.forEach((sbInfo) => {
                    this.save_scoreboard(sbInfo[0], sbInfo[1], sbInfo[2], sbInfo[3]);
                });
                setTimeout(() => {
                    this.download();
                }, this.DELAY_TIME);
            },
            push: function(sbInfo) {
                this.queue.push(sbInfo);
            },
            save_scoreboard: save_scoreboard,
        }
    }
}