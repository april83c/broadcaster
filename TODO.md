# TODO List

- User management API
	- List users
		- Option to not include users with PermissionLevel 0? Or just do that by default?
	- Set user PermissionLevel
- Panel
	- **Delete** link on topics list
	~~- **Send** notifications~~
	- User management GUI (depends on User management API)
		- User list
		- A way to change PermissionLevel (write username and pick PermissionLevel)
- Fix bugs
	- You can have empty topic description
	- You can have empty notification content
	- Wrong error message if deleting a topic with `topic: topicId` instead of `id: topicId`
- Multithreading??
	- Separate API and Websocket thread?
	- Spread listeners across threads??
- Redis