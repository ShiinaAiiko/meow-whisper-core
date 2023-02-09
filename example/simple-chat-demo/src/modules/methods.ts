import { protoRoot } from '../protos'
import store from '../store'
import qs from 'qs'

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

export const Query = (
	query: {
		[k: string]: string
	},
	searchParams: URLSearchParams
) => {
	let obj: {
		[k: string]: string
	} = {}
	searchParams.forEach((v, k) => {
		obj[k] = v
	})
	return '?' + qs.stringify(Object.assign(obj, query))
}
