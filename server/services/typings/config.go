package typings

type Config struct {
	Server           Server
	SSO              Sso
	StaticPathDomain string
	SecretChatToken  SecretChatToken
	Saass            SAaSS
	Redis            Redis
	Mongodb          Mongodb
	StaticUrlPrefix  string
	AppList          []AppListItem
}

type Server struct {
	Port int
	Cors struct {
		AllowOrigins []string
	}
	// mode: release debug
	Mode string
}
type SecretChatToken struct {
	Issuer string
	Key    string
	AesKey string
}
type SAaSS struct {
	AppId      string
	AppKey     string
	BaseUrl    string
	ApiVersion string
}
type Sso struct {
	Host string
	List map[string]struct {
		AppId  string
		AppKey string
	}
}
type Redis struct {
	Addr     string
	Password string
	DB       int
}
type Mongodb struct {
	Currentdb struct {
		Name string
		Uri  string
	}
	Ssodb struct {
		Name string
		Uri  string
	}
}
type AppListItem struct {
	AppId  string
	AppKey string
	Name   string
}
