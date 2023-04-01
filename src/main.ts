/*
	# Initialization
*/

/*
	## Imports
*/

// misc imports
import * as dotenv from 'dotenv';
dotenv.config();

import { Chalk } from 'chalk';
let chalk = new Chalk();

import * as JsonDB from 'node-json-db';

// server stuff imports
import { default as express, Express } from 'express';
import { default as BodyParser } from 'body-parser';
let jsonParser = BodyParser.json();
import { default as cors } from 'cors';

import { default as expressWs } from 'express-ws';

// auth imports
import { default as expressSession } from 'express-session';
import * as crypto from 'crypto';

import { default as passport } from 'passport';
import { RedditStrategy } from './lib/RedditStrategy.js';


// our imports
import { User, PermissionLevel, redditVerify, serializeUser, deserializeUser } from './lib/Users.js';
import { Topic, WebsocketEvent } from './lib/APITypes.js';

import { checkAuth } from './lib/CheckAuth.js';

import { topicsAPI } from './lib/Routes/Topics.js';
import { notifyAPI } from './lib/Routes/Notify.js';
import { listenAPI } from './lib/Routes/Listen.js';

/*
	## Actual initialization
*/

// check for environment variables
if (process.env.BROADCASTER_PORT == undefined
	|| process.env.BROADCASTER_BASEURL == undefined
	|| process.env.BROADCASTER_REDDIT_CONSUMER_KEY == undefined
	|| process.env.BROADCASTER_REDDIT_CONSUMER_SECRET == undefined) {
	console.error('Missing environment variables!');
	process.exit();
}

// set up db
let db = new JsonDB.JsonDB(new JsonDB.Config('data/database.json', true))

db.getData('/topics').catch((reason) => {
	console.log('db/topics doesn\'t exist, creating');
	db.push('/topics', [] as Array<Topic>);
});

// set up authentication
passport.use(new RedditStrategy({
	clientID: process.env.BROADCASTER_REDDIT_CONSUMER_KEY,
	clientSecret: process.env.BROADCASTER_REDDIT_CONSUMER_SECRET,
	callbackURL: new URL('/auth/reddit/callback', process.env.BROADCASTER_BASEURL).toString(),
	scope: ['identity'],
	state: 'fortniteburger'
}, redditVerify(db)));

passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser(db));

await db.getObject<string>('/sessionSecret').catch((error) => {
	db.push('/sessionSecret', crypto.randomBytes(128).toString('hex'));
});

// set up servers
let wsInstance = expressWs(express());
let app = wsInstance.app; // we have to do this like this, or else TS doesnt think the stuff that expressWs adds exists
app.use(expressSession({
	secret: await db.getObject<string>('/sessionSecret') as string, // intentionally not catching here
	resave: false,
	saveUninitialized: false,
	cookie: { secure: true }
}));
app.use(passport.initialize());
app.use(passport.session()); // we could make this NOT be app level middleware, so that we dont have it on routes that dont need auth, but if youre not authed it only makes ~0.05ms difference than not having it, so it doesn't really matter
app.set('view engine', 'ejs');

// API routes
app.options('/', cors());
app.get('/', cors(), async (req, res) => {
	let topics = await db.getObject<Array<Topic>>('/topics');
	res.set('Content-Type', 'text/plain');
	res.send(
`${process.env.npm_package_name}/${process.env.npm_package_version} for ${process.env.BROADCASTER_BASEURL}

${topics.length == 1 ? topics.length + ' topic' : topics.length + ' topics'}`
	);
});

app.get('/auth/reddit', passport.authenticate('reddit'));
app.get('/auth/reddit/callback', passport.authenticate('reddit', {
	successRedirect: '/bossbaby',
	failureRedirect: '/loserbaby', // TODO: change these back to / lol
	failureMessage: true
}));

app.get('/loserbaby', (req, res) => {
	//@ts-ignore
	res.send(req.session.messages);
});

// Topics API
app.use(topicsAPI(db)); // FIXME: mount to /topics specifically

// Listen (websocket)
let { listenAPIRouter, listeners } = listenAPI();
app.use(listenAPIRouter);

// Notify API
app.use(notifyAPI(db, listeners));

// Panel (user interface for humans to use the API)
app.get('/panel', checkAuth(PermissionLevel.SendMessages), (req, res) => {
	// TODO: auth
	res.render('panel');
});

app.listen(process.env.BROADCASTER_PORT, () => {
	console.log(`Ready! Listening on ${process.env.BROADCASTER_PORT}`);
});