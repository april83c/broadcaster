import * as express from 'express';
import { default as cors } from 'cors';
import * as JsonDB from 'node-json-db';
import { default as BodyParser } from 'body-parser';
let jsonParser = BodyParser.json();

import { User, PermissionLevel } from '../Users.js';
import { Topic, WebsocketEvent } from '../APITypes.js';
import { checkAuth } from '../CheckAuth.js';
import { wsWithHeartbeat } from './Listen.js';

function notifyAPI(db: JsonDB.JsonDB, listeners: Array<wsWithHeartbeat>) {
	const router = express.Router();

	router.post('/notify', checkAuth(PermissionLevel.SendMessages), jsonParser, async (req, res) => {
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

	return router;
}

export { notifyAPI };