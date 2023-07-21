/*
	Copyright (c) 2023 April <april@dummy.cafe>

	This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.
*/

import * as JsonDB from 'node-json-db';
import * as passport from 'passport';
import { Request } from 'express';

/*
	# Types
*/

enum PermissionLevel {
	None = 0, // no permissions to do anything
	SendMessages = 1, 
	Manage = 2, // manage lets you add/remove topics and manage PermissionLevel of other users
	Owner = 3 // manage permissionlevel of everyone including other owners
}

interface User extends Express.User {
	authProvider: 'reddit';// | 'someOtherStrategy'
	authId: string;
	authUsername: string;

	permissionLevel: PermissionLevel;
}

/*
	# Functions (for Passport)
*/

function redditVerify(db: JsonDB.JsonDB) {
	return (req: Request, _accessToken: any, _refreshToken: any, profile: any, done: passport.DoneCallback) => {
		// profile has: id, name, link_karma, comment_karma, _raw, _json
		// source: https://github.com/Slotos/passport-reddit/blob/main/lib/passport-reddit/strategy.js#L153
		db.getObject<User>(`/users/reddit-${profile.id}`).then((user) => {
			// update info
			user.authProvider = 'reddit';
			user.authId = profile.id;
			user.authUsername = profile.name;
			db.push(`/users/reddit-${profile.id}`, user);
			done(null, user);
		}).catch((reason: JsonDB.DataError) => {
			let user: User = {
				authProvider: 'reddit',
				authId: profile.id,
				authUsername: profile.name,
				
				permissionLevel: PermissionLevel.None
			};

			//console.log('REASON FOR GETOBJECT CREATING PROFILE:' + reason);
			if (reason.toString().endsWith('Stopped at users')) {
				console.log(`${user.authUsername} (${user.authId}) is the first user, setting PermissionLevel to Owner`);
				user.permissionLevel = PermissionLevel.Owner;
			}
			db.push(`/users/reddit-${profile.id}`, user);
			done(null, user);
		});
	}
}

function serializeUser(user: User, done: passport.DoneCallback) {
	// TODO: arewe supposed to push to db here...? 
	done(null, user.authProvider + '-' + user.authId);
};

function deserializeUser(db: JsonDB.JsonDB) {
	return async (userPath: string, done: passport.DoneCallback) => {
		try {
			let user = await db.getObject<User>(`/users/${userPath}`);
			done(null, user);
		} catch (err) {
			done(err, null);
		}
	}
}

/*
	Explanation:

	The serializeUser function is called when the user is authenticated and the session needs to be created. Its purpose is to store the user's identifying information in the session. In this example, we're using the user's authId as the identifying information, so we pass that to the done callback as the second argument.

	The deserializeUser function is called when a request is made and the session needs to be re-established. Its purpose is to retrieve the user's information from the session using the identifying information stored by serializeUser. In this example, we retrieve the user's information from the database using their authId. If the retrieval is successful, we pass the user object to the done callback as the second argument. If there's an error, we pass the error object as the first argument and null as the second argument.
*/

export { User, PermissionLevel, redditVerify, serializeUser, deserializeUser }