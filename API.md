# Broadcaster API documentation

## Topics (HTTP)

### GET /topics

Returns the available topics as a JSON array.

Required permission level: None

```json
GET /topics
```

```json
200 OK
[
	{
		"id": "topic1",
		"description": "Example topic"
	},
	{
		"id": "topic2",
		"description": "Another example"
	}
]
```

### POST /topics

Creates a new topic, and returns the updated list of topics.

Request body should be JSON of a Topic object.

Required permission level: 2 (Manage)

```json
POST /topics
{
	"id": "topic1",
	"description": "Example topic"
}
```

```json
200 OK
[
	{
		"id": "topic1",
		"description": "Example topic"
	},
	{
		"id": "topic2",
		"description": "Another example"
	}
]
```

### DELETE /topics

Deletes a topic, and returns the updated list of topics.

Request body should be JSON, with `id` being the ID of the topic you want to delete.

Required permission level: 2 (Manage)

```json
DELETE /topics
{
	"id": "topic2"
}
```

```json
200 OK
[
	{
		"id": "topic1",
		"description": "Example topic"
	}
]
```

## Users (HTTP)

### GET /users

Returns the specified User, if they exist.

Request should have the following query parameters:

- `authProvider`: the service the user uses to log in. For now, this can only be `reddit`.

and only one of the following:

- `authId`: the id of the user in the authentication provider.
- `authUsername`: the name of the user in the authentication provider.

If multiple are provided, `authId` will be prioritized.

Required permission level: 2 (Manage)

```json
GET /users
?authProvider=reddit
&authId=7qne6haa9
}
```

```json
200 OK
{
	"authProvider": "reddit",
	"authId": "7qne6haa9",
	"authUsername": "april83c",
	"permissionLevel": 3
}
```

### GET /users/me

Returns the User currently logged in.

Required permission level: 0 (None, but logged in)

```json
GET /users/me
```

```json
200 OK
{
	"authProvider": "reddit",
	"authId": "7qne6haa9",
	"authUsername": "april83c",
	"permissionLevel": 3
}
```

### POST /users

Changes something about a user, and then returns the updated User.

Request body should be JSON, with:

- `authProvider`: the service the user uses to log in. For now, this can only be `reddit`.
- `authId`: the id of the user in the authentication provider.
- The properties you want to change, which can be the following:
	- `permissionLevel`: the permission level of the user (number 0-3 as defined in `enum PermissionLevel` of [lib/Users.ts](https://github.com/april83c/broadcaster/blob/main/src/lib/Users.ts))

Restrictions:
- You can't change the permission level of a user with the same permission level as you, **unless your permission level is Owner (3), in which case you can change the permission level of anyone including other owners.**
- You can't change someone's permission level to your own permission level, **unless your permission level is Owner (3), in which case you can change anyone's permission level to any permission level including Owner (3)**
- You can't change your own permission level.

Required permission level: 2 (Manage)

```json
POST /users
{
	"authProvider": "reddit",
	"authId": "7qne6haa9",
	"permissionLevel": 2
}
```

```json
200 OK
{
	"authProvider": "reddit",
	"authId": "7qne6haa9",
	"authUsername": "april83c",
	"permissionLevel": 2
}
```

### DELETE /users/me

Deletes the currently logged in user.

```json
DELETE /users/me
```

```json
200 OK
```

## Notify (HTTP)

### POST /notify

Sends a notification to a topic*, and returns the number of people notified.

Request body should be JSON, with `topic` being the ID of the topic you want to send to, and `content` being the content of the notification.

Required permission level: 1 (SendMessages)

*It actually gets sent to everyone, since there's no mechanism to specify to the server what topics you're subscribed to. But the topic is specified in the message so the client can filter it out.

```json
POST /notify
{
	"topic": "topic1",
	"content": "Hello world!"
}
```

```json
200 OK
{
	"count": "727"
}
```

## Listen (WebSocket)

Connect to `/listen`. All messages should be in JSON and contain a `e` (stands for event) property saying what kind of message (from the below) it is.

Required permission level: None

### Server → Client: new notification

Properties:
- `e` (event): `1` (`WebsocketEvent.NewNotification`)
- `t` (topic): the Topic ID of the notification 
	- (this could be a topic the client isn't aware of but does actually exist (i.e. got added later), so don't error if this is an unknown topic!)
- `c` (content): the content of the notification
	- 1000 character limit
- WebSocket messages do **not** include properties `i` and `a` of [NotificationObject](https://github.com/april83c/broadcaster/blob/8faccbfc020edd8a936829d885e9d0993d8d2dec/src/lib/Routes/Notify.ts#L22).

## Listen Poll (HTTP)

Equivalent to `/listen`, but implemented through polling instead of WebSockets. Meant as a fallback for when a browser doesn't let the userscript connect to the WebSocket.

Returns an Array of [NotificationObject](https://github.com/april83c/broadcaster/blob/8faccbfc020edd8a936829d885e9d0993d8d2dec/src/lib/Routes/Notify.ts#L22)s.

```json
GET /listen-poll
```

```
200 OK
[
	{
		"e": "1",
		"t": "announcements",
		"c": "Lorem ipsum dolor sit amet",
		"i": "1689880572364",
		"a": "2023-07-20T19:16:12.364Z"
		
	}
]
```

Required permission level: None
