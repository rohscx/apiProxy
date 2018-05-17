/* ***************** /
Meraki Dashoard API Express Server

Supports redirects with custom request-meraki function.

/ ****************** */


// Environment  Variables

// External Configuration File
var configs = require('./configs.js');

/* Local Configuration alternative
var configs = {
    apiKey: 'YourAPIKey',
    apiUrl: 'https://api.meraki.com/api/v0'
};
*/


/* ****************** */

var express = require('express');
//var request = require('request'); // Does not properly handle Meraki redirects
var requestMeraki = require('./request-meraki');
var path = require('path');
var bodyParser = require('body-parser');
var cors = require('cors');

var app = module.exports = express();

// enable cors response for fetch compatibility.
app.use(cors());

// Development Tools
/*
var morgan = require('morgan');
app.use(morgan('dev'))

var globalLog = require('global-request-logger');
globalLog.initialize();

globalLog.on('success', function(request, response) {
  console.log('SUCCESS');
  console.log('Request', request);
  console.log('Response', response);
});
 
globalLog.on('error', function(request, response) {
  console.log('ERROR');
  console.log('Request', request);
  console.log('Response', response);
});
*/


var jsonParser = bodyParser.json();

// API Route - Will be proxied through Meraki Dashboard API
app.use('/meraki/api', jsonParser, function (req, res){
  console.log('API request url', req.url);
  console.log('API request headers', req.headers);
  console.log('request body, ', req.body);
  
  // Use client supplied API key or default to server config.
  var apiKey = '';
  if('x-cisco-meraki-api-key' in req.headers){
    apiKey = req.headers['x-cisco-meraki-api-key'];
    console.log("New headers sent", apiKey );
  }else{
    apiKey = configs.apiKey; 
  }
 
  var options = {
    qs: req.query,
    url: configs.apiUrl + req.url,
    method: req.method,
    body: JSON.stringify(req.body), 
    //followAllRedirects: true, // Does not work as intended with PUT,POST,DELETE (returns a [GET] on final location)
    headers: {
        'X-Cisco-Meraki-API-Key': apiKey,
        'Content-Type': 'application/json'
    } 
  }

  requestMeraki(options, function(err, response, data){
    if(err){
        console.log("requestMeraki err ", err)
        res.status(response.statusCode).send({
            message: 'err'
         });
        res.send(err);
    }
    console.log('FINAL res.statusCode ',response.statusCode);
    console.log('FINAL res.body ',response.body);

    res.setHeader('content-type', response.headers['content-type']);
    res.status(response.statusCode).send(data);
    
    
  });

});

// API Route - Will be proxied through Apic-EM API
app.use('/apicem/api', jsonParser, function (req, res){
	let apiToken = '';
	if('X-Auth-Token' in req.headers){
		apiToken = req.headers['X-Auth-Token'];
		console.log("New headers sent", apiToken );
	}else{
    apiToken = configs.apicToken; 
	}
	
	let options = {
		qs: req.query,
		url: configs.apicUrl + req.url,
		method: req.method,
		body: JSON.stringify(req.body), 
		//followAllRedirects: true, // Does not work as intended with PUT,POST,DELETE (returns a [GET] on final location)
		headers: {
			'X-Auth-Token': apiToken,
			'Content-Type': 'application/json'
		} 
	}
	requestMeraki(options, function(err, response, data){
	if(err){
		console.log("requestAPIRC-EM err ", err)
		res.status(response.statusCode).send({
			message: 'err'
		 });
		res.send(err);
	}
	console.log('FINAL res.statusCode ',response.statusCode);
	console.log('FINAL res.body ',response.body);

	res.setHeader('content-type', response.headers['content-type']);

	res.status(response.statusCode).send(data);
    
    
  });
})

// Home page, default route
app.use('/', express.static(path.join(__dirname, 'public')))

// Start server
var port = process.env.PORT || 8085;
var server = app.listen(port, () => {
  console.log('WWW Server: http://'+ server.address().address+port+'/');
  console.log('Meraki API Client Proxy: http://'+server.address().address+ ':' +port+'/api');
  console.log('Meraki API Endpoint: ', configs.apiUrl);
});

