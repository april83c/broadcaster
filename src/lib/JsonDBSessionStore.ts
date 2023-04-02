/*
	Copyright (c) 2023 April <april@dummy.cafe>

	This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.
*/

import EventEmitter from "events";
import { Store, SessionData } from "express-session";
import * as JsonDB from 'node-json-db';

class JsonDBSessionStore extends Store {
	db: JsonDB.JsonDB;

	constructor(db: JsonDB.JsonDB) {
		super();
		this.db = db;
	}

	get(sid: string, callback: (err: any, session?: SessionData | null) => void): void {
		this.db.getObject<SessionData>(`/sessions/${sid}`).then((session) => {
			callback(null, session);
		}).catch((error) => {
			callback(null, null);
		});
	}

	set(sid: string, session: SessionData, callback?: (err?: any) => void): void {
		this.db.push(`/sessions/${sid}`, session).then(() => {
			callback();
		}).catch((error) => {
			callback(error);
		});
	}
	
	destroy(sid: string, callback?: (err?: any) => void): void {
		this.db.delete(`/sessions/${sid}`).then(() => {
			callback();
		}).catch((error) => {
			callback(error);
		})
	}

	// touch?(sid: string, session: SessionData, callback?: () => void): void {}
}

export { JsonDBSessionStore };