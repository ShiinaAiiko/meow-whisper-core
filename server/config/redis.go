package conf

import (
	"time"

	"github.com/cherrai/nyanyago-utils/nredis"
)

var Redisdb *nredis.NRedis

var BaseKey = "meow-whisper"

var RedisCacheKeys = map[string]*nredis.RedisCacheKeysType{
	"GetApp": {
		Key:        "GetApp",
		Expiration: 5 * 60 * time.Second,
	},
	"GetFriend": {
		Key:        "GetFriend",
		Expiration: 5 * 60 * time.Second,
	},
	"GetFriendIds": {
		Key:        "GetFriendIds",
		Expiration: 5 * 60 * time.Second,
	},
	"GetInvitationCode": {
		Key:        "GetInvitationCode",
		Expiration: 5 * 60 * time.Second,
	},
	"GetICMembers": {
		Key:        "GetICMembers",
		Expiration: 5 * 60 * time.Second,
	},
	"GetICMembersList": {
		Key:        "GetICMembersList",
		Expiration: 5 * 60 * time.Second,
	},
	"User-AESKey": {
		Key: "User-AESKey",
		// Expiration: 8 * time.Second,
		Expiration: 30 * 60 * time.Second,
	},
}
