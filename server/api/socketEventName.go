package api

var Namespace = map[string](map[string]string){
	"v1": {
		"base": "/",
		"chat": "/chat",
		"room": "/room",
	},
}

var EventName = map[string](map[string](map[string]string)){
	"v1": {
		"routeEventName": {
			// App
			"error":              "Error",
			"otherDeviceOnline":  "OtherDeviceOnline",
			"otherDeviceOffline": "OtherDeviceOffline",
			"forceOffline":       "ForceOffline",

			// Room
			// type apply/agree/disagree
			"joinRoomMessage":    "JoinRoomMessage",
			"otherUserJoinRoom":  "OtherUserJoinRoom",
			"otherUserLeaveRoom": "OtherUserLeaveRoom",
			"roomInfoUpdated":    "RoomInfoUpdated",
			// 房主删除此房间后
			"forceLeaveRoom": "ForceLeaveRoom",

			// Message
			"receiveMessage": "ReceiveMessage",
			// 通过messageId
			"readMessage": "ReadMessage",
			// 通过roomId
			"readAllMessages":             "ReadAllMessages",
			"recalledMessage":             "RecalledMessage",
			"otherUserTurnOnCallMessage":  "OtherUserTurnOnCallMessage",
			"otherUserTurnOffCallMessage": "OtherUserTurnOffCallMessage",
		},
		"requestEventName": {
			"joinRoom": "JoinRoom",
			// Message 聊天用
			"sendMessage": "SendMessage",
			// 通过messageId
			"readMessage": "ReadMessage",
			// 通过roomId 阅读该房间的所有消息
			"readAllMessage": "ReadAllMessage",
			"recallMessage":  "RecallMessage",
			// 以roomId为单位，可以选择哪些用户参与
			"turnOnCallMessage":  "TurnOnCallMessage",
			"turnOffCallMessage": "TurnOffCallMessage",
		},
	},
}
