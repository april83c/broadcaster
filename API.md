# Broadcaster API documentation

## GET /topics

Returns the available topics as a JSON array.

```
GET /topics
```

```json
["topic1", "topic2"]
```

## POST /topics

Creates a new topic, and returns the updated list of topics.

Request body should be JSON, with `topic` being the name of the topic you want to create.

```json
POST /topics
{
	"topic": "topic2"
}
```

```json
["topic1", "topic2"]
```

## DELETE /topics

Deletes a topic, and returns the updated list of topics.

Request body should be JSON, with `topic` being the name of the topic you want to delete.

```json
DELETE /topics
{
	"topic": "topic2"
}
```

```json
["topic1"]
```