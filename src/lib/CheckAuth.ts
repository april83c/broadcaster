/*
	Copyright (c) 2023 April <april@dummy.cafe>

	This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.
*/

import { User, PermissionLevel } from './Users.js';
import { default as express } from 'express';

export function checkAuth(requiredLevel: PermissionLevel) {
	return (req: express.Request, res: express.Response, next: express.NextFunction) => {
		if (req.user == undefined) {
			return res.cookie('authReturnURL', req.url).redirect('/auth/reddit');
		}

		let user = req.user as User;
		if (user.permissionLevel < requiredLevel) {
			return res.status(403).json({
				error: 'You are not authorized to do this'
			});
		}

		return next();
	}
}