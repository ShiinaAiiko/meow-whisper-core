module github.com/ShiinaAiiko/meow-whisper-core/sfu-server

go 1.17

require (
	github.com/bep/debounce v1.2.0
	github.com/cherrai/saki-sso-go v1.0.0
	github.com/go-logr/logr v1.2.0
	github.com/go-redis/redis/v8 v8.11.5
	github.com/gorilla/websocket v1.5.0
	github.com/grpc-ecosystem/go-grpc-prometheus v1.2.0
	github.com/improbable-eng/grpc-web v0.14.1
	github.com/pion/ion v1.10.0
	github.com/pion/ion-log v1.2.2
	github.com/pion/ion-sfu v1.11.0
	github.com/pion/webrtc/v3 v3.1.7
	github.com/prometheus/client_golang v1.12.1
	github.com/soheilhy/cmux v0.1.5
	github.com/sourcegraph/jsonrpc2 v0.1.0
	github.com/spf13/viper v1.9.0
	golang.org/x/sync v0.0.0-20210220032951-036812b2e83c
	google.golang.org/grpc v1.41.0
)

replace (
	github.com/cherrai/nyanyago-utils => ../../../nyanya/nyanyago-utils
	github.com/cherrai/saki-sso-go v1.0.0 => ../../../cherrai/saki-sso/saki-sso-go
)

require (
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/cespare/xxhash/v2 v2.1.2 // indirect
	github.com/cherrai/nyanyago-utils v1.0.0 // indirect
	github.com/desertbit/timer v0.0.0-20180107155436-c41aec40b27f // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/fsnotify/fsnotify v1.5.1 // indirect
	github.com/gammazero/deque v0.1.0 // indirect
	github.com/gammazero/workerpool v1.1.2 // indirect
	github.com/go-logr/zerologr v1.2.0 // indirect
	github.com/go-resty/resty/v2 v2.7.0 // indirect
	github.com/golang-jwt/jwt v3.2.2+incompatible // indirect
	github.com/golang/protobuf v1.5.2 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/hashicorp/hcl v1.0.0 // indirect
	github.com/klauspost/compress v1.11.7 // indirect
	github.com/lucsky/cuid v1.2.1 // indirect
	github.com/magiconair/properties v1.8.5 // indirect
	github.com/mattn/go-colorable v0.1.8 // indirect
	github.com/mattn/go-isatty v0.0.12 // indirect
	github.com/matttproud/golang_protobuf_extensions v1.0.1 // indirect
	github.com/mgutz/ansi v0.0.0-20200706080929-d51e80ef957d // indirect
	github.com/mitchellh/mapstructure v1.5.0 // indirect
	github.com/mozillazg/go-pinyin v0.19.0 // indirect
	github.com/pelletier/go-toml v1.9.4 // indirect
	github.com/pion/datachannel v1.5.0 // indirect
	github.com/pion/dtls/v2 v2.0.10 // indirect
	github.com/pion/ice/v2 v2.1.13 // indirect
	github.com/pion/interceptor v0.1.0 // indirect
	github.com/pion/logging v0.2.2 // indirect
	github.com/pion/mdns v0.0.5 // indirect
	github.com/pion/randutil v0.1.0 // indirect
	github.com/pion/rtcp v1.2.8 // indirect
	github.com/pion/rtp v1.7.4 // indirect
	github.com/pion/sctp v1.7.12 // indirect
	github.com/pion/sdp/v3 v3.0.4 // indirect
	github.com/pion/srtp/v2 v2.0.5 // indirect
	github.com/pion/stun v0.3.5 // indirect
	github.com/pion/transport v0.12.3 // indirect
	github.com/pion/turn/v2 v2.0.5 // indirect
	github.com/pion/udp v0.1.1 // indirect
	github.com/prometheus/client_model v0.2.0 // indirect
	github.com/prometheus/common v0.32.1 // indirect
	github.com/prometheus/procfs v0.7.3 // indirect
	github.com/rs/cors v1.7.0 // indirect
	github.com/rs/zerolog v1.26.0 // indirect
	github.com/sirupsen/logrus v1.8.1 // indirect
	github.com/spf13/afero v1.6.0 // indirect
	github.com/spf13/cast v1.4.1 // indirect
	github.com/spf13/jwalterweatherman v1.1.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	github.com/subosito/gotenv v1.2.0 // indirect
	golang.org/x/crypto v0.0.0-20210921155107-089bfa567519 // indirect
	golang.org/x/net v0.0.0-20211029224645-99673261e6eb // indirect
	golang.org/x/sys v0.0.0-20220114195835-da31bd327af9 // indirect
	golang.org/x/term v0.0.0-20201126162022-7de9c90e9dd1 // indirect
	golang.org/x/text v0.3.6 // indirect
	golang.org/x/xerrors v0.0.0-20200804184101-5ec99f83aff1 // indirect
	google.golang.org/genproto v0.0.0-20210828152312-66f60bf46e71 // indirect
	google.golang.org/protobuf v1.28.0 // indirect
	gopkg.in/ini.v1 v1.63.2 // indirect
	gopkg.in/yaml.v2 v2.4.0 // indirect
	nhooyr.io/websocket v1.8.6 // indirect
)
