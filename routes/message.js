var express = require('express');
var client = require('./../client');

var router = express.Router();

router.post('/', function(req, res, next){
	client
		.sendMessage(req.body.message.chat.id, 'Come posso esserti utile?')
		.promise()
		.then(function(){
			res.json({ok: true});
		})
		.catch(next);
});

module.exports = router;
