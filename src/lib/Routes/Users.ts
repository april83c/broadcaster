import * as express from 'express';
import * as JsonDB from 'node-json-db';
import { default as BodyParser } from 'body-parser';
let jsonParser = BodyParser.json();
let urlencoded = BodyParser.urlencoded()

import { checkAuth } from '../CheckAuth.js';
import { PermissionLevel, User } from '../Users.js';

function usersAPI(db: JsonDB.JsonDB) {
	const router = express.Router();

	router.get('/users', checkAuth(PermissionLevel.Manage), urlencoded, async (req, res) => {
		// TODO: check if authProvider or Id contain a dot (to prevent traversing to different parts of the database)
		if (req.query.authProvider == undefined || 
				(req.query.authId == undefined 
				&& req.query.authUsername == undefined)) {
			return res.status(400).json({
				error: "Malformed request query parameters. Please see API documentation."
			});
		}
		try {
			if (req.query.authId != undefined) {
				let user = await db.getObject<User>(`/users/${req.query.authProvider}-${req.query.authId}`);
				res.status(200).json(user);
			} else if (req.query.authUsername != undefined) {
				let users = await db.getObject<{ [key: string]: User }>('/users');
				let found = false;
				for (const userPath in users) {
					let user = users[userPath];
					if (user.authUsername.toLowerCase() == (req.query.authUsername as string).toLowerCase()) {
						res.status(200).json(user);
						found = true;
						break;
					}
				}

				// if we didn't find the user
				if (!found) throw Error;
			}
		} catch (err) {
			res.status(404).json({
				error: 'User not found, or an error occured trying to find it'
			});
		}
	});

	router.get('/users/me', checkAuth(PermissionLevel.None), jsonParser, async (req, res) => {
		try {
			let requestUser = req.user as User;
			let dbUser = await db.getObject<User>(`/users/${requestUser.authProvider}-${requestUser.authId}`);
			res.status(200).json(dbUser);
		} catch {
			res.status(404).json({
				error: 'User not found, or an error occured trying to find it'
			});
		}
	});

	router.post('/users', checkAuth(PermissionLevel.Manage), jsonParser, async (req, res) => {
		if (req.body.authProvider == undefined || req.body.authId == undefined || 
			(req.body.permissionLevel == undefined /* && other changeable stuff here */)) {
			return res.status(400).json({
				error: 'Malformed request body. Please see API documentation.'
			});
		}
		try {
			let user = await db.getObject<User>(`/users/${req.body.authProvider}-${req.body.authId}`);
			let requestUser = req.user as User;

			if (req.body.permissionLevel != undefined &&
				(requestUser.permissionLevel > user.permissionLevel || requestUser.permissionLevel == PermissionLevel.Owner) && // can't change the permission level of a user with the same permission level as you, unless you're owner
				(requestUser.permissionLevel > req.body.permissionLevel || requestUser.permissionLevel == PermissionLevel.Owner) && // can't change to your own permission level, unless you're owner
				(requestUser.authProvider == user.authProvider && requestUser.authId == user.authId) && // can't change your own permission level
				(PermissionLevel[req.body.permissionLevel] != undefined) // can't change to a permission level that doesn't exist
				) {
					
				user.permissionLevel = req.body.permissionLevel as PermissionLevel; // FIXME: is this bad? can we just "as" this? idk
			}

			db.push(`/users/${user.authProvider}-${user.authId}`, user, true);
			res.status(200).json(user);
		} catch {
			res.status(404).json({
				error: 'User not found, or an error occured trying to find it'
			})
		}
	});

	// TODO: DELETE /users/me - Deletes the currently logged in user.
	
	return router;
}

export { usersAPI };