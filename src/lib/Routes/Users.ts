import * as express from 'express';
import * as JsonDB from 'node-json-db';
import { default as BodyParser } from 'body-parser';
let jsonParser = BodyParser.json();

import { checkAuth } from '../CheckAuth.js';
import { PermissionLevel, User } from '../Users.js';

function usersAPI(db: JsonDB.JsonDB) {
	const router = express.Router();

	router.get('/users', jsonParser, async (req, res) => {
		// TODO: check if authProvider or Id contain a dot (to prevent traversing to different parts of the database)
		if (req.body.authProvider == undefined || 
				(req.body.authId == undefined 
				&& req.body.authUsername == undefined)) {
			return res.status(400).json({
				error: "No authProvider and/or search parameter specified"
			});
		}
		try {
			if (req.body.authId != undefined) {
				let user = await db.getObject<User>(`/users/${req.body.authProvider}-${req.body.authId}`);
				res.status(200).json(user);
			} else if (req.body.authUsername != undefined) {
				let users = await db.getObject<{ [key: string]: User }>('/users');
				for (const userPath in users) {
					let user = users[userPath];
					if (user.authUsername == req.body.authUsername) {
						res.status(200).json(user);
						break;
					}
				}

				// if we didn't find the user
				throw Error;
			}
		} catch (err) {
			res.status(404).json({
				error: 'User not found, or an error occured trying to find it'
			});
		}
	});

	/*router.post('/users', checkAuth(PermissionLevel.Manage), (req, res) => {

	});*/
	
	return router;
}

export { usersAPI };