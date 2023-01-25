package methods

func GetType(id string) string {
	t := id[0:1]
	switch t {
	case "G":
		return "Group"

	default:
		return "Contact"
	}
}

func IsMemberOfRoom(appId, roomId, uid string) int64 {
	// 判断是否在此room内
	t := GetType(roomId)
	if t == "Contact" {
		isMember := contactDbx.GetContact(appId, []string{
			uid,
		}, []int64{1, 0}, roomId)
		if isMember == nil {
			return 10105
		}
	}
	if t == "Group" {
		isMember := groupDbx.GetGroupMember(appId, roomId, uid, []int64{1, 0})
		if isMember == nil {
			return 10305
		}
	}
	return 200
}
