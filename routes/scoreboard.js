var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
	console.log("call scoreboard crawler");
})

module.exports = router;