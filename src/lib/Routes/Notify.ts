/*
	Copyright (c) 2023 April <april@dummy.cafe>

	This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.
*/

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
				error: "Malformed request body. Please see API documentation."
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