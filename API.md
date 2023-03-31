# Broadcaster API documentation

## GET /topics

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

## POST /topics

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

## DELETE /topics

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