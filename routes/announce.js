var express = require('express');
var router = express.Router();
var announce_uet = require('../project_modules/announce_chanels/announce_uet.js');

router.get('/', (req, res) => {
	console.log("call announce crawler");
	res.sendStatus(200);
	announce_uet.start();
})

module.exports = router;