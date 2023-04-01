import { User, PermissionLevel } from './Users.js';
import { default as express } from 'express';

export function checkAuth(requiredLevel: PermissionLevel) {
	return (req: express.Request, res: express.Response, next: express.NextFunction) => {
		if (req.user == undefined) return res.redirect('/auth/reddit');

		let user = req.user as User;
		if (user.permissionLevel < requiredLevel) {
			return res.status(403).json({
				error: 'You are not authorized to do this'
			});
		}

		return next();
	}
}