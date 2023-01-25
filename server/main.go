package main

import (
	"context"
	"os"

	conf "github.com/ShiinaAiiko/meow-whisper-core/config"
	mongodb "github.com/ShiinaAiiko/meow-whisper-core/db/mongo"
	redisdb "github.com/ShiinaAiiko/meow-whisper-core/db/redis"
	"github.com/ShiinaAiiko/meow-whisper-core/services/encryption"
	"github.com/ShiinaAiiko/meow-whisper-core/services/gin_service"
	"github.com/ShiinaAiiko/meow-whisper-core/services/methods"
	"github.com/ShiinaAiiko/meow-whisper-core/services/socketio_service"

	"github.com/cherrai/nyanyago-utils/nlog"
	"github.com/cherrai/nyanyago-utils/nredis"
	sso "github.com/cherrai/saki-sso-go"

	// sfu "github.com/pion/ion-sfu/pkg/sfu"

	"github.com/go-redis/redis/v8"
)

var (
	log = nlog.New()
)

func main() {
	nlog.SetPrefixTemplate("[{{Timer}}] [{{Count}}] [{{Type}}] [{{File}}]@{{Name}}")
	nlog.SetName("github.com/ShiinaAiiko/meow-whisper-core")
	// nlog.SetFullFileName(true)
	nlog.SetFileNameLength(30)
	nlog.SetTimeDigits(3)

	// type User struct {
	// 	Type     string `protobuf:"bytes,1,opt,name=type,proto3" json:"type,omitempty"`
	// 	PageSize int64  `protobuf:"varint,2,opt,name=pageSize,proto3" json:"pageSize,omitempty"`
	// 	PageNum  int64  `protobuf:"varint,3,opt,name=pageNum,proto3" json:"pageNum,omitempty"`
	// }
	// user := &User{"chronos", 1, 2}
	// s := reflect.TypeOf(user).Elem()  //通过反射获取type定义
	// v := reflect.ValueOf(user).Elem() //通过反射获取type定义

	// fmt.Println(reflect.TypeOf(user))
	// fmt.Println(reflect.TypeOf(user).Elem())
	// fmt.Println(v)
	// for i := 0; i < s.NumField(); i++ {
	// 	fmt.Println("value", v.Field(i))
	// 	fmt.Println(s.Field(i).Name)            //将tag输出出来
	// 	fmt.Println(s.Field(i).Type)            //将tag输出出来
	// 	fmt.Println(s.Field(i).Tag)             //将tag输出出来
	// 	fmt.Println(s.Field(i).Tag.Get("json")) //将tag输出出来
	// }

	// friendLog := models.FriendsLog{
	// 	FriendId: 1,
	// 	AuthorId: 1,
	// 	Remark:   "sasasasasasasasasasasasasasasasasasasasasasasasasasasasa",
	// }
	// // fmt.Println("friendLog", friendLog)
	// err := friendLog.Default()
	// Log.Error("errerrerrerrerrerr", err)
	// return
	// Log.Info("Test")
	// Log.Error("=========Error=========")
	// Log.Warn("=========Error=========")
	// Log.Time("耗时")
	// Log.TimeEnd("耗时")

	// sfu
	// encryption.Test()
	// 正式代码
	defer func() {
		log.Info("=========Error=========")
		if err := recover(); err != nil {
			log.FullCallChain(err.(error).Error(), "Error")
		}
		log.Info("=========Error=========")
	}()

	configPath := ""
	for k, v := range os.Args {
		switch v {
		case "--config":
			if os.Args[k+1] != "" {
				configPath = os.Args[k+1]
			}
			break

		}
	}
	if configPath == "" {
		log.Error("Config file does not exist.")
		return
	}
	conf.GetConfig(configPath)

	// Connect to redis.
	redisdb.ConnectRedis(&redis.Options{
		Addr:     conf.Config.Redis.Addr,
		Password: conf.Config.Redis.Password, // no password set
		DB:       conf.Config.Redis.DB,       // use default DB
	})

	conf.Redisdb = nredis.New(context.Background(), &redis.Options{
		Addr:     conf.Config.Redis.Addr,
		Password: conf.Config.Redis.Password, // no password set
		DB:       conf.Config.Redis.DB,       // use default DB
	}, conf.BaseKey)
	conf.Redisdb.CreateKeys(conf.RedisCacheKeys)

	// Connect to mongodb.
	mongodb.ConnectMongoDB(conf.Config.Mongodb.Currentdb.Uri, conf.Config.Mongodb.Currentdb.Name)
	mongodb.ConnectMongoDB(conf.Config.Mongodb.Ssodb.Uri, conf.Config.Mongodb.Ssodb.Name)

	methods.InitAppList()
	// SSO Init
	for _, v := range conf.Config.AppList {
		ssoApp := conf.Config.SSO.List[v.AppId]
		conf.SSOList[v.AppId] = sso.New(&sso.SakiSsoOptions{
			AppId:  ssoApp.AppId,
			AppKey: ssoApp.AppKey,
			Host:   conf.Config.SSO.Host,
			RedisOptions: &redis.Options{
				Addr:     conf.Config.Redis.Addr,
				Password: conf.Config.Redis.Password,
				DB:       conf.Config.Redis.DB,
			},
		})
	}
	conf.SSO = sso.New(&sso.SakiSsoOptions{
		AppId:  "conf.Config.SSO.AppId",
		AppKey: "conf.Config.SSO.AppKey",
		Host:   conf.Config.SSO.Host,
		RedisOptions: &redis.Options{
			Addr:     conf.Config.Redis.Addr,
			Password: conf.Config.Redis.Password,
			DB:       conf.Config.Redis.DB,
		},
	})

	// Test()
	conf.EncryptionClient = encryption.New(encryption.NewOption{
		RedisClient:     redisdb.Rdb,
		RsaKeyDelayDays: 10,
		UserAesKeyMins:  10,
		TempDataMins:    1,
	})
	socketio_service.Init()
	gin_service.Init()

	// time.Sleep(time.Second * time.Duration(1))
	gin_service.Init()
}
