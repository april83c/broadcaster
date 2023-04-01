import * as JsonDB from 'node-json-db';
import * as passport from 'passport';

/*
	# Types
*/

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

/*
	# Functions (for Passport)
*/

function redditVerify(db: JsonDB.JsonDB) {
	return (_accessToken: any, _refreshToken: any, profile: any, done: passport.DoneCallback) => {
		console.log('reddit verify: ' + profile)
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
	}
}

function serializeUser(user: User, done: passport.DoneCallback) {
	console.log('serializing user: ' + user)
	done(null, user.authProvider + '-' + user.authId);
};

function deserializeUser(db: JsonDB.JsonDB) {
	return async (userPath: string, done: passport.DoneCallback) => {
		console.log('deseralizing user: ' + userPath)
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