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