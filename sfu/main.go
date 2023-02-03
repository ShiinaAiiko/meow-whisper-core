package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	// "github.com/MetahorizonLab/meow-whisper-sfu-server/module/mhlsso"
	jsonrpc "github.com/ShiinaAiiko/meow-whisper-core/sfu-server/sfu/signal/json-rpc"

	"github.com/cherrai/nyanyago-utils/nlog"
	sso "github.com/cherrai/saki-sso-go"
	"github.com/go-redis/redis/v8"
	"github.com/pion/ion-sfu/pkg/sfu"
)

type Config struct {
	sfu.Config
	SFU struct {
		Ballast   int64 `mapstructure:"ballast"`
		WithStats bool  `mapstructure:"withstats"`
		Port      int64 `mapstructure:"port"`
	} `mapstructure:"sfu"`
	Metrics struct {
		Port int64 `mapstructure:"port"`
	} `mapstructure:"metrics"`
	Mhlsso struct {
		AppId  string `mapstructure:"appId"`
		AppKey string `mapstructure:"appKey"`
		Host   string `mapstructure:"host"`
	}
	MeowWhisperCore struct {
		AppId  string `mapstructure:"appId"`
		AppKey string `mapstructure:"appKey"`
		Url    string `mapstructure:"url"`
	}
	Redis struct {
		Addr     string `mapstructure:"addr"`
		Password string `mapstructure:"password"`
		Db       int    `mapstructure:"db"`
	} `mapstructure:"redis"`
}

var (
	conf *Config
	file string = ""
)

const (
	portRangeLimit = 100
)

func load() bool {
	// fmt.Println("HASH", hash.StringMd5("sas"))
	LOCALHOST := "localhost"
	if os.Getenv("DOCKER_LOCALHOST") != "" {
		LOCALHOST = os.Getenv("DOCKER_LOCALHOST")
	}
	args := os.Args //获取用户输入的所有参数
	if args == nil {
		return false
	}

	for index, item := range args {
		if item == "--config" {
			file = args[index+1]
		}
	}
	if file == "" {
		return false
	}
	fmt.Println(file)

	jsonFile, _ := os.Open(file)

	defer jsonFile.Close()
	decoder := json.NewDecoder(jsonFile)
	//Decode从输入流读取下一个json编码值并保存在v指向的值里
	err := decoder.Decode(&conf)

	if err != nil {
		log.Println(err, "sfu config file loaded failed", "file", file)
		return false
	}

	fmt.Println("conf.SFU 81", conf.SFU)
	fmt.Println("conf.WebRTC 82", conf.WebRTC)
	fmt.Println("conf.Router 82", conf.Router)
	fmt.Println("conf.Turn 82", conf.Turn)

	if len(conf.WebRTC.ICEPortRange) > 2 {
		log.Println(nil, "config file loaded failed. webrtc port must be [min,max]", "file", file)
		return false
	}

	if len(conf.WebRTC.ICEPortRange) != 0 && conf.WebRTC.ICEPortRange[1]-conf.WebRTC.ICEPortRange[0] < portRangeLimit {
		log.Println(nil, "config file loaded failed. webrtc port must be [min, max] and max - min >= portRangeLimit", "file", file, "portRangeLimit", portRangeLimit)
		return false
	}

	if len(conf.Turn.PortRange) > 2 {
		log.Println(nil, "config file loaded failed. turn port must be [min,max]", "file", file)
		return false
	}
	conf.Mhlsso.Host = strings.Replace(conf.Mhlsso.Host, "localhost", LOCALHOST, -1)
	conf.Redis.Addr = strings.Replace(conf.Redis.Addr, "localhost", LOCALHOST, -1)

	return true
}
func main() {

	if !load() {
		os.Exit(-1)
	}
	nlog.SetPrefixTemplate("[{{Timer}}] [{{Count}}] [{{Type}}] [{{File}}]@{{Name}}")
	nlog.SetName("meow-whisper-core-sfu")
	// nlog.SetFullFileName(true)
	nlog.SetFileNameLength(30)
	nlog.SetTimeDigits(3)

	mhlsso := sso.New(&sso.SakiSsoOptions{
		AppId:  conf.Mhlsso.AppId,
		AppKey: conf.Mhlsso.AppKey,
		Host:   conf.Mhlsso.Host,
		RedisOptions: &redis.Options{
			Addr:     conf.Redis.Addr,
			Password: conf.Redis.Password,
			DB:       conf.Redis.Db,
		},
	})

	type SFU struct {
		Ballast   int64 `mapstructure:"ballast"`
		WithStats bool  `mapstructure:"withstats"`
	}
	jsonrpc.New(sfu.Config{
		SFU: SFU{
			Ballast:   conf.SFU.Ballast,
			WithStats: conf.SFU.WithStats,
		},
		WebRTC:        conf.WebRTC,
		Router:        conf.Router,
		Turn:          conf.Turn,
		BufferFactory: conf.BufferFactory,
		TurnAuth:      conf.TurnAuth,
	}, jsonrpc.NewOptions{
		SfuPort:         conf.SFU.Port,
		MetricsPort:     conf.Metrics.Port,
		Sso:             mhlsso,
		MeowWhisperCore: conf.MeowWhisperCore,
	})
}
