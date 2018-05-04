var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
	console.log("call announce crawler");
})

module.exports = router;