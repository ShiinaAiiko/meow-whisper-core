package models

import (
	"errors"
	"time"

	conf "github.com/ShiinaAiiko/meow-whisper-core/config"
	mongodb "github.com/ShiinaAiiko/meow-whisper-core/db/mongo"

	"github.com/cherrai/nyanyago-utils/validation"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// 聊天记录策略：
// 1、包含有个人、群的ID存储
// 2、包含有发送人、回复ID、群ID、信息内容、发送时间、
// 有效期时间（倒计时、拓展）、撤回时间、
// 已有哪些人看过（记录UID）。
// 3、缓存30天，过期自动删除。
// 4、本地聊天记录最后一条ID的时间戳开始拉取线上之前的记
// 录，直到没有
// 5、接口：获取当前好友或者群的有效期内的未读信息数量、
// 红点
// 6、艾特人除了msg里有该标签名称外。还要加上艾特UID数组

type MessagesAudio struct {
	// Time Unix timestamp
	Time int64 `bson:"time" json:"time"`
	// Url
	Url string `bson:"url" json:"url"`
}
type MessagesVideo struct {
	// Time Unix timestamp
	Time int64 `bson:"time" json:"time"`
	// Url
	Url string `bson:"url" json:"url"`
}
type MessagesImage struct {
	// Url
	Url string `bson:"url" json:"url"`
}
type MessagesCallParticipants struct {
	Uid int64 `bson:"uid" json:"uid"`
}
type MessagesCall struct {
	// Status:
	// 1 connected successfully
	// 0 calling
	// -1 Missing call
	// -2 Other devices calling
	// -3 Invite to join the call
	Status int64 `bson:"status" json:"status"`
	// RoomId
	RoomId string `bson:"roomId" json:"roomId"`
	// Participants UID
	Participants []MessagesCallParticipants `bson:"participants" json:"participants"`
	// GroupId, pick one of two
	GroupId int64 `bson:"groupId" json:"groupId"`
	// Initiator
	AuthorId int64 `bson:"authorId" json:"authorId"`
	// Type: Audio Video ScreenShare
	Type string `bson:"type" json:"type"`
	// Time Unix timestamp
	Time int64 `bson:"time" json:"time"`
}

type Messages struct {
	Id primitive.ObjectID `bson:"_id" json:"id,omitempty"`
	// RoomId md5(appId+groupId/appId+authorId+friendId)
	RoomId      string             `bson:"roomId" json:"roomId,omitempty"`
	AuthorId    string             `bson:"authorId" json:"authorId"`
	ReplyId     primitive.ObjectID `bson:"replyId,omitempty" json:"replyId"`
	AtUserIds   []string           `bson:"atUserIds" json:"atUserIds"`
	ReadUserIds []string           `bson:"readUserIds" json:"readUserIds"`
	// 转发一堆聊天记录、（预留）
	ForwardChatIds []primitive.ObjectID `bson:"forwardChatIds" json:"forwardChatIds"`
	Message        string               `bson:"message" json:"message"`
	Audio          MessagesAudio        `bson:"audio" json:"audio"`
	Video          MessagesVideo        `bson:"video" json:"video"`
	Image          MessagesImage        `bson:"image" json:"image"`
	Call           MessagesCall         `bson:"call" json:"call"`
	DeletedUserIds []string             `bson:"deletedUserIds" json:"deletedUserIds"`
	// Status:
	// 1 normal
	// 0 recall
	// -1 deleted （暂时弃用）
	Status       int64 `bson:"status" json:"status,omitempty"`
	CreateTime   int64 `bson:"createTime" json:"createTime"`
	DeadlineTime int64 `bson:"deadlineTime" json:"deadlineTime"`
	RecallTime   int64 `bson:"recallTime" json:"recallTime"`
}

func (cr *Messages) GetCollectionName() string {
	return "Messages"
}

func (cr *Messages) Default() error {
	if cr.Id == primitive.NilObjectID {
		cr.Id = primitive.NewObjectID()
	}
	unixTimeStamp := time.Now().Unix()
	if cr.AtUserIds == nil {
		cr.AtUserIds = []string{}
	}
	if cr.ForwardChatIds == nil {
		cr.ForwardChatIds = []primitive.ObjectID{}
	}
	// if cr.ReplyId == primitive.NilObjectID {
	// 	cr.ReplyId = primitive.NewObjectID()
	// }
	if cr.Status == 0 {
		cr.Status = 1
	}

	if cr.ReadUserIds == nil {
		cr.ReadUserIds = []string{}
	}
	if cr.DeletedUserIds == nil {
		cr.DeletedUserIds = []string{}
	}
	if cr.CreateTime == 0 {
		cr.CreateTime = unixTimeStamp
	}
	if cr.DeadlineTime == 0 {
		cr.DeadlineTime = -1
	}
	if cr.RecallTime == 0 {
		cr.RecallTime = -1
	}

	if err := cr.Validate(); err != nil {
		return errors.New(cr.GetCollectionName() + " Validate: " + err.Error())
	}
	return nil
}

func (cr *Messages) GetCollection() *mongo.Collection {
	return mongodb.GetCollection(conf.Config.Mongodb.Currentdb.Name, cr.GetCollectionName())
}

func (cr *Messages) Validate() error {
	return validation.ValidateStruct(
		cr,
		validation.Parameter(&cr.RoomId, validation.Required()),
		validation.Parameter(&cr.Id, validation.Required()),
		validation.Parameter(&cr.Status, validation.Enum([]int64{1, 0, -1})),
		validation.Parameter(&cr.AuthorId, validation.Required()),
		validation.Parameter(&cr.CreateTime, validation.Required()),
	)
}

// 获取总页码的最后一条是根据时间排序的最后一条正确
// 远程和本地分为两个。

// 优先获取远程，页码全部独立。前端的页码显示加起来即可。

// 而如果远程则时间倒序，第一个就是之前的讨论的第一条。然后添加到本地，获取了一半就从之前的记录。
// 均是优先远程
