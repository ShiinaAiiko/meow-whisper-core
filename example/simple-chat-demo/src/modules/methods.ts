import { protoRoot } from '../protos'
import store from '../store'

export const getDialogueInfo = (v: any) => {
	const { mwc } = store.getState()
	if (!v)
		return {
			avatar: '',
			name: '',
			bio: '',
		}
	if (v.type === 'Group') {
		const ginfo = mwc.cache.group.get(v.id || '')

		return {
			avatar: ginfo?.avatar || '',
			name: ginfo?.name || '',
			bio: '',
		}
	}
	const uinfo = mwc.cache.userInfo.get(v.id || '')

	return {
		avatar: uinfo?.userInfo?.avatar || '',
		name: uinfo?.userInfo?.nickname || '',
		bio: uinfo?.userInfo?.bio || '',
	}
}
