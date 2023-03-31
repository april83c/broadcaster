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

// types
interface Topic { 
	id: string,
	description: string
};

// set up db
let db = new JsonDB.JsonDB(new JsonDB.Config('data/database.json', true))

db.getData('/topics').catch((reason) => {
	console.log('db/topics doesn\'t exist, creating');
	db.push('/topics', [] as Array<Topic>);
});

// set up server
let app = express();
let wsServer: ws.WebSocketServer = new ws.WebSocketServer({
	noServer: true,
	clientTracking: true
});

app.get('/', async (req, res) => {
	let topics = await db.getObject<Array<Topic>>('/topics');
	res.set('Content-Type', 'text/plain');
	res.send(
`${process.env.npm_package_name}/${process.env.npm_package_version} for ${process.env.BROADCASTER_HOSTNAME}

${topics.length == 1} ? ${topics.length} topic : ${topics.length} topics`
	);
});

app.get('/topics', async (req, res) => {
	let topics = await db.getObject<Array<Topic>>('/topics');
	res.status(200).json(topics);
});

app.post('/topics', jsonParser, async (req, res) => {
	let topics = await db.getObject<Array<Topic>>('/topics');
	let topicIdRegex = /^[a-zA-Z0-9_-]+$/;

	if (req.body.id == undefined || req.body.description == undefined) {
		return res.status(400).json({
			error: 'No topic ID and/or description specified'
		});
	}

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