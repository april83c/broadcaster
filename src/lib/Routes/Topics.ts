import * as express from 'express';
import { default as cors } from 'cors';
import * as JsonDB from 'node-json-db';
import { default as BodyParser } from 'body-parser';
let jsonParser = BodyParser.json();

import { User, PermissionLevel } from '../Users.js';
import { Topic, WebsocketEvent } from '../APITypes.js';
import { checkAuth } from '../CheckAuth.js';

function topicsAPI(db: JsonDB.JsonDB) {
	const router = express.Router();

	// Topics API
	router.options('/topics', cors({ allowedHeaders: 'GET' }));
	router.get('/topics', cors(), async (req, res) => {
		let topics = await db.getObject<Array<Topic>>('/topics');
		res.status(200).json(topics);
	});

	router.post('/topics', checkAuth(PermissionLevel.Manage), jsonParser, async (req: express.Request, res: express.Response) => {
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

	router.delete('/topics', checkAuth(PermissionLevel.Manage), jsonParser, async (req, res) => {
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

	return router;
}

export { topicsAPI };