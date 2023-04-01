interface Topic { 
	id: string,
	description: string
};

enum WebsocketEvent {
	NewNotification = 1
}

export { Topic, WebsocketEvent }