/*
	Copyright (c) 2023 April <april@dummy.cafe>

	This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.
*/

import { default as ws } from 'ws';
import * as express from 'express';
import type { NotificationObject } from "./Notify.js";

interface wsWithHeartbeat extends ws {
	isAlive?: boolean; // if we don't have this question mark here typescript gets mad when we cast it below, and i'm sure there is a better way to fix that than adding this question mark, but this works
}

// seconds
const NOTIFICATIONS_POLL_BACKLOG_LIFETIME = 10;
const NOTIFICATIONS_POLL_LISTENERS_MEASURE_INTERVAL = 60;

function listenAPI() {
	const listenAPIRouter = express.Router();
	let listeners: Array<wsWithHeartbeat> = [];
	let notificationsBacklog: Array<NotificationObject> = [];
	let notificationsPollRequests = 0;
	let notificationsPollListeners = 0;

	function sendNotification(notificationObject: NotificationObject) {
		let notificationJson = JSON.stringify(notificationObject);
		for (const ws of listeners) {
			ws.send(notificationJson, (err: any) => { if (err) console.error('Failed to send notification: ' + err); });
		}

		notificationObject.a = new Date();
		notificationObject.i = (+notificationObject.a).toString();
		notificationsBacklog.push(notificationObject);
	}

	function getListenersLength() {
		return listeners.length + notificationsPollListeners;
	}

	function pollMeasureListeners() {
		notificationsPollListeners = notificationsPollRequests;
		notificationsPollRequests = 0;
	}
	setInterval(pollMeasureListeners, NOTIFICATIONS_POLL_LISTENERS_MEASURE_INTERVAL * 1000);

	function pollCleanBacklog() {
		const now = Math.floor(+new Date());
		notificationsBacklog = notificationsBacklog.filter((obj) => obj.a && ((now - Math.floor(+obj.a)) < NOTIFICATIONS_POLL_BACKLOG_LIFETIME*1000));
	}
	setInterval(pollCleanBacklog, NOTIFICATIONS_POLL_BACKLOG_LIFETIME * 1000);

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

	/* Explanation:
		A possible compromise is to use a single setInterval() with a short delay (such as 10 milliseconds) and ping only a subset of connections each time. For example, you could use an array or a queue to store all the sockets and shift a few of them every time the interval runs. Then you can ping those sockets and push them back to the end of the array or queue. This way, you can ensure that all sockets are pinged regularly without causing too much overhead.
	*/ // I don't know if this is actually better for performance than having a spike every 30 seconds where we ping every single websocket, but theoretically it seems better... unless setTimeout suuucks

	listenAPIRouter.ws('/listen', (ws: wsWithHeartbeat, req) => {
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

	listenAPIRouter.get("/listen-poll", (req, res) => {
		notificationsPollRequests++;
		res.status(200).json(JSON.stringify(notificationsBacklog));
	});

	return { listenAPIRouter, sendNotification, getListenersLength };
}

export { wsWithHeartbeat, listenAPI };