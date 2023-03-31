// misc imports
import * as dotenv from 'dotenv';
dotenv.config();
import { Chalk } from 'chalk';
let chalk = new Chalk();
import * as JsonDB from 'node-json-db';

// server stuff imports
import { default as express } from 'express';
import * as url from 'url';
import * as ws from 'ws';
import { default as BodyParser } from 'body-parser';
let jsonParser = BodyParser.json();

// check for environment variables
if (process.env.BROADCASTER_PORT == undefined
	|| process.env.BROADCASTER_HOSTNAME == undefined) {
	console.error('Missing environment variables!');
	process.exit();
}

// set up db
let db = new JsonDB.JsonDB(new JsonDB.Config('data/database.json', true))

db.getData('/topics').catch((reason) => {
	console.log('db/topics doesn\'t exist, creating');
	db.push('/topics', [] as Array<string>);
});

// set up server
let app = express();
let wsServer: ws.WebSocketServer = new ws.WebSocketServer({
	noServer: true,
	clientTracking: true
});

app.get('/', async (req, res) => {
	let topics = await db.getObject<Array<string>>('/topics');
	res.set('Content-Type', 'text/plain');
	res.send(
`${process.env.npm_package_name}/${process.env.npm_package_version} for ${process.env.BROADCASTER_HOSTNAME}

${topics.length > 0 ? 'Topics: ' + topics : 'No topics registered'}`
	);
});

app.get('/topics', async (req, res) => {
	let topics = await db.getObject<Array<string>>('/topics');
	res.status(200).json(topics);
});

app.post('/topics', jsonParser, async (req, res) => {
	let topics = await db.getObject<Array<string>>('/topics');
	let topicNameRegex = /^[a-zA-Z0-9_-]+$/;
	console.log(req.body);
	let topicName = req.body.topic as string;

	if (topicName == undefined) {
		return res.status(400).json({
			error: 'No topic name specified'
		});
	}
	if (!(topicNameRegex.test(topicName))) {
		return res.status(400).json({
			error: 'Topic name must match ' + topicNameRegex
		}); // is this the wrong status code
	}
	if (topics.indexOf(topicName) != -1) {
		return res.status(400).json({
			error: 'Topic with that name already exists'
		});
	}

	topics.push(topicName);
	db.push('/topics', topics);
	return res.status(200).json(topics);
});

app.delete('/topics', jsonParser, async (req, res) => {
	let topics = await db.getObject<Array<string>>('/topics');
	let topicName = req.body.topic as string;

	let topicIndex = topics.indexOf(topicName);

	if (topicIndex == -1) {
		return res.status(400).json({
			error: 'No topic with that name exists'
		});
	}

	topics.splice(topicIndex, 1);
	
	db.push('/topics', topics);
	return res.status(200).json(topics);
})

app.listen(process.env.BROADCASTER_PORT, () => {
	console.log(`Ready! Listening on ${process.env.BROADCASTER_PORT}`);
});