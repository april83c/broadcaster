/*
	Copyright (c) 2023 April <april@dummy.cafe>

	This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.
*/

/*
	# Initialization
*/

/*
	## Imports
*/

// misc imports
import * as dotenv from 'dotenv';
dotenv.config();

import * as JsonDB from 'node-json-db';

// server stuff imports
import { default as express, Express } from 'express';
import { default as BodyParser } from 'body-parser';
let jsonParser = BodyParser.json();
import { default as cookieParser } from 'cookie-parser';
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

import { JsonDBSessionStore } from './lib/JsonDBSessionStore.js';
import { checkAuth } from './lib/CheckAuth.js';

import { topicsAPI } from './lib/Routes/Topics.js';
import { notifyAPI } from './lib/Routes/Notify.js';
import { listenAPI } from './lib/Routes/Listen.js';
import { usersAPI } from './lib/Routes/Users.js';

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
	//cookie: { secure: true }
	cookie: { sameSite: false },
	store: new JsonDBSessionStore(db)
}));
//app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session()); // we could make this NOT be app level middleware, so that we dont have it on routes that dont need auth, but if youre not authed it only makes ~0.05ms difference than not having it, so it doesn't really matter
app.set('view engine', 'ejs');

// set up authentication
passport.use(new RedditStrategy({
	clientID: process.env.BROADCASTER_REDDIT_CONSUMER_KEY,
	clientSecret: process.env.BROADCASTER_REDDIT_CONSUMER_SECRET,
	callbackURL: new URL('/auth/reddit/callback', process.env.BROADCASTER_BASEURL).toString(),
	scope: ['identity'],
	state: false,
	passReqToCallback: true
}, redditVerify(db)));

passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser(db));

// API routes

// Auth endpoints
app.get('/auth/reddit', passport.authenticate('reddit', {
	//state: 'fortniteburger'
}));
app.get('/auth/reddit/callback', passport.authenticate('reddit', {
	successRedirect: '/',
	//failureRedirect: '/loserbaby', // TODO: change these back to / lol
	failureMessage: true,
	//state: 'fortniteburger'
}/*, cookieParser(), (req: express.Request, res: express.Response) => {
	console.log(req);
	if (req && req.cookies['authReturnURL']) {
		if (req.cookies['authReturnURL'])
		res.redirect(req.cookies['authReturnURL']);
	} else {
		res.redirect(new URL('/', process.env.BROADCASTER_BASEURL).toString()); // baseurl envvar here and not hostname in case req doesn't exist
	}
}*/));
app.post('/auth/logout', (req, res) => {
	req.logout((error) => {
		if (error) return res.status(500).send(error);
		res.redirect('/');
	})
});

// Topics API
app.use(topicsAPI(db)); // FIXME: mount to /topics specifically

// Listen (websocket)
let { listenAPIRouter, sendNotification, getListenersLength } = listenAPI();
app.use(listenAPIRouter);

// Notify API
app.use(notifyAPI(db, sendNotification, getListenersLength));

// Users API
app.use(usersAPI(db));

// Panel (user interface for humans to use the API)
app.get('/', /*checkAuth(PermissionLevel.SendMessages), */async (req, res) => {
	let topics = await db.getObject<Array<Topic>>('/topics');
	res.render('panel', { user: req.user, topics: topics, listenerCount: getListenersLength() });
});

app.listen(process.env.BROADCASTER_PORT, () => {
	console.log(`Ready! Listening on ${process.env.BROADCASTER_PORT}`);
});