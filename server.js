/* ***************** /
Meraki Dashoard API Express Server

Supports redirects with custom request-meraki function.

/ ****************** */


// Environment  letiables

// External Configuration File
const configs = require('./configs.js');

/* Local Configuration alternative
let configs = {
    apiKey: 'YourAPIKey',
    apiUrl: 'https://api.meraki.com/api/v0'
};
*/


/* ****************** */

const express = require('express');
//let request = require('request'); // Does not properly handle Meraki redirects
const requestMeraki = require('./request-meraki');
const requestApicEM = require('./request-apicem');
const requestPrime = require('./request-prime.js');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = module.exports = express();


app.use(cors());

// Development Tools
/*
let morgan = require('morgan');
app.use(morgan('dev'))

let globalLog = require('global-request-logger');
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

//defines Routes
const routesObj = {
	meraki:'/meraki/api',
	apicem:'/apicem/api',
	prime:'/pi/api'
}

let jsonParser = bodyParser.json();

// API Route - Will be proxied through Meraki Dashboard API
app.use(routesObj.meraki, jsonParser, function (req, res){
  console.log('API request url', req.url);
  console.log('API request headers', req.headers);
  console.log('request body, ', req.body);
  
  // Use client supplied API key or default to server config.
  let apiKey = '';
  if('x-cisco-meraki-api-key'.toLowerCase() in req.headers){
    apiKey = req.headers['x-cisco-meraki-api-key'];
    console.log("New headers sent", apiKey );
  }else{
    apiKey = configs.merakiKey; 
  }
 
  let options = {
    qs: req.query,
    url: configs.merakiUrl + req.url,
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
app.use(routesObj.apicem, jsonParser, function (req, res){
	let apiToken = '';
	if('X-Auth-Token'.toLowerCase() in req.headers){
		apiToken = req.headers['X-Auth-Token'.toLowerCase()];
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
	requestApicEM(options, function(err, response, data){
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


// API Route - Will be proxied through ciscoPrime Infranstructure
app.use(routesObj.prime, jsonParser, function (req, res){
	let apiToken = '';
	if('Authorization'.toLowerCase() in req.headers){
		apiToken = req.headers['X-Auth-Token'.toLowerCase()];
		console.log("New headers sent", apiToken );
	}else{
    apiToken = configs.primeKey; 
	}
	
	let options = {
		qs: req.query,
		url: configs.primeUrl + req.url,
		method: req.method,
		body: JSON.stringify(req.body), 
		//followAllRedirects: true, // Does not work as intended with PUT,POST,DELETE (returns a [GET] on final location)
		headers: {
			'Authorization': apiToken,
			'Content-Type': 'application/json'
		} 
	}
	requestPrime(options, function(err, response, data){
	if(err){
		console.log("requestPrime err ", err)
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
let port = process.env.PORT || 8085;
let server = app.listen(port, () => {
  console.log('WWW Server: http://'+ server.address().address+port+'/');
  Object.keys(routesObj).map(data => console.log(data.toUpperCase()+' API Client Proxy: http://'+server.address().address+ ':' +port+routesObj[data]))
  Object.keys(configs).filter(f => f.includes("Url")).map(data => console.log(data.toUpperCase()+' API Endpoint: ', configs[data]))
});

