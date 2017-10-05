/*
	besokind server
*/

require('dotenv').config();
const https = require('https');
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const querystring = require('querystring');
const clientCertificateAuth = require('client-certificate-auth');

const auth = require('./lib/auth');
const db = require('./lib/db');

let app = express();
let mailchimpAxios = axios.create({
	baseURL: process.env.MAILCHIMP_URL,
	timeout: 15000,
	auth: {
		username: process.env.MAILCHIMP_USER,
		password: process.env.MAILCHIMP_PASS
	}
});

const expressSession = require('express-session');
const SessionStore = db.createSessionStore(expressSession);
let sessionStore = new SessionStore({ pool: db.pool });
app.use(cors());
app.use(express.static('public', {extensions: ['html']}));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({extended: true}));
app.use(expressSession({
	store: sessionStore,
	name: 'a',
	secret: process.env.SESSION_SECRET,
	resave: true,
	saveUninitialized: true
}));
app.use(auth.initialize());
app.use(auth.session());

app.get('/auth/vkontakte', auth.authenticate('vkontakte'));
app.get('/auth/vkontakte/callback',
	auth.authenticate('vkontakte', {
		// successRedirect: '/logged_in',
		successRedirect: '/beta',
		failureRedirect: '/login'
	})
);
function clientAuth(cert) {
	return true;
}
app.post('/vkcallback', clientCertificateAuth(clientAuth), (req, res) => {
	console.log('\n\nreq.body', typeof req.body, req.body, '\n\n');
	res.send('f6639b92');
});


app.get('/', (req, res) => {
	console.log('## hello')
	res.sendFile('public/welcome.html', {root: __dirname});
});

app.get('/login', (req, res) => {
	// todo: сделать страницу /login для фейла при заходе через vk
	res.send('Login page');
});

app.get('/loggedIn', (req, res) => {
	if (req.user) {
		res.json(req.user);
	} else {
		res.json({error: "Somehow user is not available after succesfull callback"});
	}
});

app.get('/getUser', (req, res) => {
	db.getUser(req.query.id)
		.then(user => res.json(user))
		.catch(error => res.json({error: error.toString()}))
});

// TODO: return something and check status of operation
app.get('/setUserCity', (req, res) => {
	let {id, city} = req.query;
	db.updateUserCity(id, city);
	res.send('ok');
});

app.get('/getCard', (req, res) => {
	let cardId = req.query.id;
});

app.get('/feed', (req, res) => {
	let city = req.query.city;
	let feedResponse = res;
	db.getCards(city)
		.then(cards => {
			console.log('\n\n 2 /feed recieved db.getCards', typeof cards, cards, '\n\n');
			feedResponse.json({cards: cards});
			console.log('\n\n 2.1 /feed recieved db.getCards after feedResponse.json() send cards');
		})
		.catch(error => res.json({error: error.toString()}));
});

// '/createCard?body=haha%20hello&city=Irkutstk&creationTime=1498020318949&creationTimeFriendly=123',
app.get('/createCard', (req, res) => {
	let uid = req.user && req.user.id;
	console.log('\n\ncreateCard', uid, req.query, '\n\n');
	if (uid) {
		let card = {
			"author_id": uid,
			"body": req.query.body,
			"city": req.query.city,
			"creation_time": new Date(+req.query.creationTime),
			"creation_time_friendly": req.query.creationTimeFriendly,
			"status": 0
		};
		db.createCard(card)
			.then((id) => res.json({id: id}))
			.catch((error) => res.json({error: error.toString()}));
	} else {
		res.json({error: "User should be logged in to create a card"});
	}
});

// Besokind WebAPI ended

// Subscribe to any news from besokind
app.get('/subscribe', (req, res) => {
	console.log('\n\nreq.query.telega', +req.query.helpOrganize, +req.query.telegram, '\n\n');
	let data = JSON.stringify({
		'email_address': req.query.email,
		'status': 'subscribed',
		'merge_fields': {
			'FNAME': req.query.name || '',
			'CITY': req.query.city || '',
			'AGE': +req.query.age || 0,
			'PHONE': req.query.phone || '',
			'TAGS': req.query.tags || '',
			'ORGANIZE': +req.query.helpOrganize || 0,
			'TELEGRAM': +req.query.telegram || 0
		}
	});

	mailchimpAxios.post('/lists/fb59af48ee/members/', data)
		.then((response) => {
			console.log('\n\nsuccess:', response.status, response.statusText, '\n\n');
			res.json({status: response.status, statusText: response.statusText})
		})
		.catch((error) => {
			console.log('\n\nerror:', error.response.status, error.response.statusText, error.response.data, '\n\n');
			res.json({status: error.response.status, statusText: error.response.statusText})
		});
});

// TODO error should have similar structure. now I have string and object
app.get('/city', (request, response) => {
	var ip = request.headers['x-forwarded-for'] || 
		request.connection.remoteAddress || 
		request.socket.remoteAddress ||
		request.connection.socket.remoteAddress;

	response.set('Access-Control-Allow-Origin', '*');

	console.log('\n\n## ip:\n', ip, '\n');

	// sometimes ip is string of 2 addresses "31.47.177.61, 188.43.29.50"
	// just take first
	var coma = ip.indexOf(',');
	if (coma > -1) {
		ip = ip.substr(0, coma);
	}

	if (!ip) {
		response.send({error: 'ip not defined'});
		return;
	}

	axios.get(`http://freegeoip.net/json/${ip}`)
		.then(success => response.send({data: success.data}))
		.catch(error => response.send({error: error}))
});


app.listen(process.env.PORT, function() {
	console.log(`listening ${process.env.PORT}`)
});
