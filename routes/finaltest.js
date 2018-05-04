var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
	console.log("call finaltest crawler");
})

module.exports = router;