package dbxV1

import (
	"context"
	"errors"

	"github.com/ShiinaAiiko/meow-whisper-core/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MessagesDbx struct {
}

func (d *MessagesDbx) SendMessage(message *models.Messages) (*models.Messages, error) {
	if err := message.Default(); err != nil {
		return nil, err
	}
	_, err := message.GetCollection().InsertOne(context.TODO(), message)
	if err != nil {
		return nil, err
	}
	return message, nil
}

func (d *MessagesDbx) GetAllUnredMessages(roomIds []string, authorId string) ([]*models.Messages, error) {
	m := new(models.Messages)

	params := []bson.M{
		{
			"$match": bson.M{
				"$or": []bson.M{
					{
						"roomId": bson.M{
							"$in": roomIds,
						},
						"readUserIds": bson.M{
							"$nin": []string{authorId},
						},
						"deletedUserIds": bson.M{
							"$nin": []string{authorId},
						},
						"status": bson.M{
							"$in": []int64{1},
						},
					},
				},
				// and groupId
			},
		}, {
			"$sort": bson.M{
				"createTime": 1,
			},
		},
	}
	log.Info("params", params)
	var results []*models.Messages
	opts, err := m.GetCollection().Aggregate(context.TODO(), params)
	if err != nil {
		// log.Error(err)
		return nil, err
	}
	if err = opts.All(context.TODO(), &results); err != nil {
		// log.Error(err)
		return nil, err
	}
	// log.Info(*results[0])
	return results, nil
}

func (d *MessagesDbx) GetMessageById(messgeIds []primitive.ObjectID) ([]*models.Messages, error) {
	m := new(models.Messages)

	// log.Info("messagesIds", messgeIds)
	params := []bson.M{
		{
			"$match": bson.M{
				"$or": []bson.M{
					{
						"_id": bson.M{
							"$in": messgeIds,
						},
						"status": bson.M{
							"$in": []int64{1},
						},
					},
				},
				// and groupId
			},
		}, {
			"$sort": bson.M{
				"createTime": 1,
			},
		},
	}
	log.Info("params", params)
	var results []*models.Messages
	opts, err := m.GetCollection().Aggregate(context.TODO(), params)
	if err != nil {
		// log.Error(err)
		return nil, err
	}
	if err = opts.All(context.TODO(), &results); err != nil {
		// log.Error(err)
		return nil, err
	}
	// log.Info(*results[0])
	return results, nil
}

func (d *MessagesDbx) GetHistoricalMessages(
	roomId, authorId string,
	pageNum,
	pageSize,
	startTime,
	endTime int64) ([]*models.Messages, error) {
	m := new(models.Messages)

	params := []bson.M{
		{
			"$match": bson.M{
				"$and": []bson.M{
					{
						"roomId": roomId,
						"deletedUserIds": bson.M{
							"$nin": []string{authorId},
						},
						"status": bson.M{
							"$in": []int64{1},
						},
					}, {
						"createTime": bson.M{
							"$gt": startTime,
						},
					}, {
						"createTime": bson.M{
							"$lt": endTime,
						},
					},
				},
				// and groupId
			},
		}, {
			"$sort": bson.M{
				"createTime": -1,
			},
		},
		{
			"$skip": pageSize * (pageNum - 1),
		},
		{
			"$limit": pageSize,
		},
	}
	log.Info("params", params)
	var results []*models.Messages
	opts, err := m.GetCollection().Aggregate(context.TODO(), params)
	if err != nil {
		// log.Error(err)
		return nil, err
	}
	if err = opts.All(context.TODO(), &results); err != nil {
		// log.Error(err)
		return nil, err
	}
	// log.Info(*results[0])
	return results, nil
}

func (d *MessagesDbx) ReadAllMessages(
	roomId, authorId string) error {
	m := new(models.Messages)
	result, err := m.GetCollection().UpdateMany(context.TODO(),
		bson.M{
			"roomId": roomId,
			"authorId": bson.M{
				"$ne": authorId,
			},
			"readUserIds": bson.M{
				"$nin": []string{authorId},
			},
			"status": bson.M{
				"$in": []int64{1, 0},
			},
		}, bson.M{
			"$push": bson.M{
				"readUserIds": authorId,
			},
		}, options.Update().SetUpsert(false))

	if err != nil {
		return err
	}
	if result.ModifiedCount == 0 {
		return errors.New("delete failed")
	}
	return nil
}
