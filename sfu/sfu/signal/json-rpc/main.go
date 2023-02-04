// Package cmd contains an entrypoint for running an ion-sfu instance.
package jsonrpc

import (
	"fmt"
	"net"
	"net/http"
	_ "net/http/pprof"
	"os"
	"strconv"

	"github.com/ShiinaAiiko/meow-whisper-core/sfu-server/sfu/signal/json-rpc/server"
	"github.com/cherrai/nyanyago-utils/nlog"
	sso "github.com/cherrai/saki-sso-go"
	"github.com/gorilla/websocket"
	log "github.com/pion/ion-sfu/pkg/logger"
	"github.com/pion/ion-sfu/pkg/middlewares/datachannel"
	"github.com/pion/ion-sfu/pkg/sfu"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sourcegraph/jsonrpc2"
	websocketjsonrpc2 "github.com/sourcegraph/jsonrpc2/websocket"
)

// logC need to get logger options from config
type logC struct {
	Config log.GlobalConfig `mapstructure:"log"`
}

var (
	conf           = sfu.Config{}
	file           string
	cert           string
	key            string
	addr           string
	metricsAddr    string
	verbosityLevel int
	logConfig      logC
	logger         = log.New()

	nlogger = nlog.New()
)

const (
	portRangeLimit = 100
)

func showHelp() {
	fmt.Printf("Usage:%s {params}\n", os.Args[0])
	// fmt.Println("      -c {config file}")
	fmt.Println("      -cert {cert file}")
	fmt.Println("      -key {key file}")
	fmt.Println("      -a {listen addr}")
	fmt.Println("      -h (show help info)")
	fmt.Println("      -v {0-10} (verbosity level, default 0)")
}

func load() bool {
	// _, err := os.Stat(file)
	// if err != nil {
	// 	return false
	// }

	// viper.SetConfigFile(file)
	// // fmt.Println("file", file)
	// viper.SetConfigType("toml")

	// err = viper.ReadInConfig()
	// if err != nil {
	// 	logger.Error(err, "config file read failed", "file", file)
	// 	return false
	// }
	// err = viper.GetViper().Unmarshal(&conf)
	// // fmt.Println("conf", conf.Turn)
	// // fmt.Println("conf", conf.Turn.Auth)
	// // fmt.Println("conf", conf.WebRTC)
	// // fmt.Println("conf", conf.WebRTC.ICEServers)

	// if err != nil {
	// 	logger.Error(err, "sfu config file loaded failed", "file", file)
	// 	return false
	// }

	// if len(conf.WebRTC.ICEPortRange) > 2 {
	// 	logger.Error(nil, "config file loaded failed. webrtc port must be [min,max]", "file", file)
	// 	return false
	// }

	// if len(conf.WebRTC.ICEPortRange) != 0 && conf.WebRTC.ICEPortRange[1]-conf.WebRTC.ICEPortRange[0] < portRangeLimit {
	// 	logger.Error(nil, "config file loaded failed. webrtc port must be [min, max] and max - min >= portRangeLimit", "file", file, "portRangeLimit", portRangeLimit)
	// 	return false
	// }

	// if len(conf.Turn.PortRange) > 2 {
	// 	logger.Error(nil, "config file loaded failed. turn port must be [min,max]", "file", file)
	// 	return false
	// }

	// if logConfig.Config.V < 0 {
	// 	logger.Error(nil, "Logger V-Level cannot be less than 0")
	// 	return false
	// }

	// logger.V(0).Info("Config file loaded", "file", file)
	return true
}

func parse() bool {
	// flag.StringVar(&file, "c", "config.toml", "config file")
	// flag.StringVar(&cert, "cert", "", "cert file")
	// flag.StringVar(&key, "key", "", "key file")
	// // flag.StringVar(&addr, "a", ":"+strconv.FormatInt(conf.SFU.Port, 10), "address to use")
	// // flag.StringVar(&metricsAddr, "m", ":"+strconv.FormatInt(conf.Metrics.Port, 10), "merics to use")
	// flag.IntVar(&verbosityLevel, "v", -1, "verbosity level, higher value - more logs")
	// help := flag.Bool("h", false, "help info")
	// flag.Parse()
	if !load() {
		return false
	}

	// if *help {
	// 	return false
	// }
	return true
}

func startMetrics(addr string) {
	// start metrics server
	m := http.NewServeMux()
	m.Handle("/metrics", promhttp.Handler())
	srv := &http.Server{
		Handler: m,
	}

	metricsLis, err := net.Listen("tcp", addr)
	if err != nil {
		logger.Error(err, "cannot bind to metrics endpoint", "addr", addr)
		os.Exit(1)
	}
	logger.Info("Metrics Listening", "addr", addr)

	err = srv.Serve(metricsLis)
	if err != nil {
		logger.Error(err, "Metrics server stopped")
	}
}

type NewOptions struct {
	SfuPort         int64
	MetricsPort     int64
	Sso             *sso.SakiSSO
	MeowWhisperCore struct {
		AppId  string `mapstructure:"appId"`
		AppKey string `mapstructure:"appKey"`
		Url    string `mapstructure:"url"`
	}
}

type CustomData struct {
	AppId  string
	Uid    string
	RoomId string
}

func New(config sfu.Config, option NewOptions) {
	// request := resty.New()
	conf = config
	addr = ":" + strconv.FormatInt(option.SfuPort, 10)
	metricsAddr = ":" + strconv.FormatInt(option.MetricsPort, 10)

	if !parse() {
		showHelp()
		os.Exit(-1)
	}
	// if config != (sfu.Config{}) {
	// 	conf = config
	// }

	// Check that the -v is not set (default -1)
	if verbosityLevel < 0 {
		verbosityLevel = 1
	}

	log.SetGlobalOptions(log.GlobalConfig{V: verbosityLevel})
	logger.Info("--- Starting SFU Node ---")

	// Pass logr instance
	sfu.Logger = logger
	fmt.Println("config", config.WebRTC)
	fmt.Println("config", config.WebRTC.Timeouts)
	fmt.Println("config", config.Turn)
	s := sfu.NewSFU(config)
	dc := s.NewDatachannel(sfu.APIChannelLabel)
	dc.Use(datachannel.SubscriberAPI)

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	http.Handle("/ws", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			panic(err)
		}
		defer c.Close()
		// u, _ := url.Parse(r.URL.String())
		// values := u.Query()

		// fmt.Println("------------------开始校验------------------")
		// fmt.Println(values.Get("token"), 11111)

		// token := values.Get("token")

		// var customData CustomData
		// err = json.Unmarshal([]byte(values.Get("customData")), &customData)
		// if err != nil {
		// 	fmt.Println("err: ", err)
		// 	c.Close()
		// 	return
		// }
		// // nlogger.Info(token, uid, customData)
		// if option.MeowWhisperCore.AppId != customData.AppId {
		// 	nlogger.Error("Connection failed, appid is incorrect.")
		// 	return
		// }

		// res, err := request.R().SetFormData(map[string]string{
		// 	"appId":  option.MeowWhisperCore.AppId,
		// 	"appKey": option.MeowWhisperCore.AppKey,
		// 	"uid":    customData.Uid,
		// 	"roomId": customData.RoomId,
		// 	"token":  token,
		// }).Post(option.MeowWhisperCore.Url + "/api/v1/call/token/verify")
		// if err != nil {
		// 	nlogger.Error(err)
		// 	return
		// }

		// var m nresponse.NResponse
		// err = json.Unmarshal([]byte(res.Body()), &m)
		// if err != nil {
		// 	nlogger.Error("Unmarshal with error: %+v\n", err)
		// 	return
		// }
		// if m.Code != 200 {
		// 	nlogger.Error("Connection failed", m)
		// 	nlogger.Error("Parameter:", token, customData)
		// 	c.Close()
		// 	return
		// }
		// nlogger.Info("Connection succeeded")

		// var userAgent sso.UserAgent
		// err = json.Unmarshal([]byte(values.Get("userAgent")), &userAgent)
		// if err != nil {
		// 	fmt.Println("err: ", err)
		// 	c.Close()
		// 	return
		// }
		// ret, err := option.Sso.Verify(token, deviceId, userAgent)
		// fmt.Println("res", ret)
		// if err != nil {
		// 	fmt.Println("jwt: ", err)
		// }
		// if token != "" && ret != nil {

		p := server.NewJSONSignal(sfu.NewPeer(s), logger)
		defer p.Close()

		// fmt.Println("r.Context()", r.Context())
		jc := jsonrpc2.NewConn(r.Context(), websocketjsonrpc2.NewObjectStream(c), p)
		<-jc.DisconnectNotify()
		// }

	}))

	go startMetrics(metricsAddr)

	var err error
	if key != "" && cert != "" {
		logger.Info("Started listening", "addr", "https://"+addr)
		err = http.ListenAndServeTLS(addr, cert, key, nil)
	} else {
		logger.Info("Started listening", "addr", "http://"+addr)
		err = http.ListenAndServe(addr, nil)
	}
	if err != nil {
		panic(err)
	}
}
