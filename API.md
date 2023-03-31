# Broadcaster API documentation

## Topics (HTTP)

### GET /topics

Returns the available topics as a JSON array.

```
GET /topics
```

```json
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

```json
POST /topics
{
	"id": "topic1",
	"description": "Example topic"
}
```

```json
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

```json
DELETE /topics
{
	"id": "topic2"
}
```

```json
[
	{
		"id": "topic1",
		"description": "Example topic"
	}
]
```

## Listen (WebSocket)

Connect to `/listen`. All messages should be in JSON and contain a `e` (stands for event) property saying what kind of message (from the below) it is.

### Server → Client: new notification

Properties:
- `e` (event): `1` (`WebsocketMessage.NewNotification`)
- `t` (topic): the Topic ID of the notification 
	- (this could be a topic the client isn't aware of but does actually exist (i.e. got added later), so don't error if this is an unknown topic!)
- `c` (content): the content of the notification
	- 1000 character limit