// misc imports
import * as dotenv from 'dotenv';
dotenv.config();
import { Chalk } from 'chalk';
let chalk = new Chalk();
import * as JsonDB from 'node-json-db';

// server stuff imports
import { default as express, Express } from 'express';
import { default as expressWs } from 'express-ws';
import { default as ws } from 'ws';
import { default as BodyParser } from 'body-parser';
let jsonParser = BodyParser.json();
import { default as cors } from 'cors';

// auth imports
import { default as passport } from 'passport';
import { RedditStrategy } from 'passport-reddit'
import { default as expressSession } from 'express-session';
import * as crypto from 'crypto';

// check for environment variables
if (process.env.BROADCASTER_PORT == undefined
	|| process.env.BROADCASTER_BASEURL == undefined
	|| process.env.BROADCASTER_REDDIT_CONSUMER_KEY == undefined
	|| process.env.BROADCASTER_REDDIT_CONSUMER_SECRET == undefined) {
	console.error('Missing environment variables!');
	process.exit();
}

// types
interface Topic { 
	id: string,
	description: string
};

enum WebsocketEvent {
	NewNotification = 1
}

enum PermissionLevel {
	None = 0, // no permissions to do anything
	SendMessages = 1, 
	Manage = 2 // manage lets you add/remove topics and manage PermissionLevel of other users
}

interface User extends Express.User {
	authProvider: 'reddit';// | 'someOtherStrategy'
	authId: string;
	authUsername: string;

	permissionLevel: PermissionLevel;
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
	callbackURL: new URL('/auth/reddit/callback', process.env.BROADCASTER_BASEURL).toString()
}, 
(_accessToken: any, _refreshToken: any, profile: any, done: passport.DoneCallback) => {
	// profile has: id, name, link_karma, comment_karma, _raw, _json
	// source: https://github.com/Slotos/passport-reddit/blob/main/lib/passport-reddit/strategy.js#L153
	db.getObject<User>(`/users/reddit-${profile.id}`).then((user) => {
		// update info
		user.authProvider = 'reddit';
		user.authId = profile.id;
		user.authUsername = profile.name;
		db.push(`/users/reddit-${profile.id}`, user);
		done(null, user);
	}).catch((reason: string) => {
		let user: User = {
			authProvider: 'reddit',
			authId: profile.id,
			authUsername: profile.name,
			
			permissionLevel: PermissionLevel.None
		};

		console.log('REASON FOR GETOBJECT CREATING PROFILE:' + reason);
		if (reason.endsWith('Stopped at /users')) {
			console.log(`${user.authUsername} (${user.authId}) is the first user, setting PermissionLevel to Manage`);
			user.permissionLevel = PermissionLevel.Manage;
		}
		db.push(`/users/reddit-${profile.id}`, user);
		done(null, user);
	});
}));

/*
	Explanation:

	The serializeUser function is called when the user is authenticated and the session needs to be created. Its purpose is to store the user's identifying information in the session. In this example, we're using the user's authId as the identifying information, so we pass that to the done callback as the second argument.

	The deserializeUser function is called when a request is made and the session needs to be re-established. Its purpose is to retrieve the user's information from the session using the identifying information stored by serializeUser. In this example, we retrieve the user's information from the database using their authId. If the retrieval is successful, we pass the user object to the done callback as the second argument. If there's an error, we pass the error object as the first argument and null as the second argument.
*/

passport.serializeUser((user: User, done) => {
	done(null, user.authProvider + '-' + user.authId);
});

passport.deserializeUser(async (userPath, done) => {
	try {
		let user = await db.getObject<User>(`/users/${userPath}`);
		done(null, user);
	} catch (err) {
		done(err, null);
	}
});

await db.getObject<string>('/sessionSecret').catch((error) => {
	db.push('/sessionSecret', crypto.randomBytes(128).toString('hex'));
});

function checkAuth(requiredLevel: PermissionLevel) {
	return (req: express.Request, res: express.Response, next: express.NextFunction) => {
		if (req.user == undefined) return res.redirect('/auth/reddit');

		let user = req.user as User;
		if (user.permissionLevel < requiredLevel) {
			return res.status(403).json({
				error: 'You are not authorized to do this'
			});
		}

		return next();
	}
}


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
	successRedirect: '/',
	failureRedirect: '/'
}));

// Topics API
app.options('/topics', cors({ allowedHeaders: 'GET' }));
app.get('/topics', cors(), async (req, res) => {
	let topics = await db.getObject<Array<Topic>>('/topics');
	res.status(200).json(topics);
});

app.post('/topics', jsonParser, checkAuth(PermissionLevel.Manage), async (req: express.Request, res: express.Response) => {
	if (req.body.id == undefined || req.body.description == undefined) {
		return res.status(400).json({
			error: 'No topic ID and/or description specified'
		});
	}

	let topics = await db.getObject<Array<Topic>>('/topics');
	let topicIdRegex = /^[a-zA-Z0-9_-]+$/;

	let topic: Topic = { id: req.body.id, description: req.body.description };

	if (!(topicIdRegex.test(topic.id))) {
		return res.status(400).json({
			error: 'Topic ID must match ' + topicIdRegex
		}); // is this the wrong status code
	}
	if (topics.findIndex(t => t.id == topic.id) != -1) {
		return res.status(400).json({
			error: 'Topic with that ID already exists'
		});
	}

	// TODO: should we do any regex on the topic description? actually, probably not, because if XSS is possible on the client then that should be fixed on the client, because someone could just set up a malicious Broadcaster without that regex check
	topics.push(topic);
	db.push('/topics', topics);
	return res.status(200).json(topics);
});

app.delete('/topics', jsonParser, async (req, res) => {
	let topics = await db.getObject<Array<Topic>>('/topics');
	let topicId = req.body.id as string;

	let topicIndex = topics.findIndex(t => t.id == topicId);

	if (topicIndex == -1) {
		return res.status(400).json({
			error: 'No topic with that ID exists'
		});
	}

	topics.splice(topicIndex, 1);
	
	db.push('/topics', topics);
	return res.status(200).json(topics);
});

// Notify API
app.post('/notify', jsonParser, async (req, res) => {
	if (req.body.topic == undefined || req.body.content == undefined) {
		return res.status(400).json({
			error: "No topic and/or content specified"
		})
	}
	
	let topics = await db.getObject<Array<Topic>>('/topics');
	let topicIndex = topics.findIndex(t => t.id == req.body.topic);

	if (topicIndex == -1) {
		return res.status(400).json({
			error: 'No topic with that ID exists'
		});
	}

	if (req.body.content.length > 1000) {
		return res.status(400).json({
			error: 'Content cannot be longer than 1000 characters'
		});
	}

	let notificationJson = JSON.stringify({
		e: WebsocketEvent.NewNotification,
		t: req.body.topic,
		c: req.body.content // we could do checks to make sure theres no XSS here, but if a bad actor wanted to do XSS they could just spin up their own Broadcaster without the check, so we need to mitigate that in the client
	});

	listeners.forEach(((ws) => {
		ws.send(notificationJson, (err) => { if (err) console.error('Failed to send notification: ' + err); });
	}));
	console.log(`Sent notification on topic ${req.body.topic}: ${req.body.content}`)

	return res.status(200).json({
		count: listeners.length
	});
});

// Panel (user interface for humans to use the API)
app.get('/panel', (req, res) => {
	// TODO: auth
	res.render('panel');
});

// Listen (websocket)
interface wsWithHeartbeat extends ws {
	isAlive?: boolean; // if we don't have this question mark here typescript gets mad when we cast it below, and i'm sure there is a better way to fix that than adding this question mark, but this works
}

let listeners: Array<wsWithHeartbeat> = [];

/* Explanation:
	A possible compromise is to use a single setInterval() with a short delay (such as 10 milliseconds) and ping only a subset of connections each time. For example, you could use an array or a queue to store all the sockets and shift a few of them every time the interval runs. Then you can ping those sockets and push them back to the end of the array or queue. This way, you can ensure that all sockets are pinged regularly without causing too much overhead.
*/ // I don't know if this is actually better for performance than having a spike every 30 seconds where we ping every single websocket, but theoretically it seems better... unless setTimeout suuucks
function handleHeartbeat() {
	if (listeners.length > 0) {
		let ws = listeners[0];
		if (ws.isAlive == false && ws.isAlive != undefined) {
			ws.terminate();
			console.log('terminated')
		} else {
			ws.isAlive = false;
			ws.ping();
			listeners.push(listeners.shift());
		}
		setTimeout(handleHeartbeat, Math.max(10 * 1000 / listeners.length, 10)); // each connection should get checked every ~120 seconds
	} else {
		setTimeout(handleHeartbeat, 30000);
	}
}
handleHeartbeat();

app.ws('/listen', (ws: wsWithHeartbeat, req) => {
	ws.on('message', (message) => {
		// we don't do anything here; the client isn't supposed to send anything
	});

	ws.on('close', (connection) => {
		let index = listeners.indexOf(ws);
		if (index != -1) {
			listeners.splice(index, 1);
		}
	});

	// heartbeat
	ws.isAlive = true;
	ws.on('pong', () => {
		ws.isAlive = true;
	});

	listeners.push(ws);
});

app.listen(process.env.BROADCASTER_PORT, () => {
	console.log(`Ready! Listening on ${process.env.BROADCASTER_PORT}`);
});