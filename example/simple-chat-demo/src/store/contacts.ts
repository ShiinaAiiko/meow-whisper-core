import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import md5 from 'blueimp-md5'
import store, { ActionParams, configSlice, RootState } from '.'
import { PARAMS, protoRoot } from '../protos'
import {
	WebStorage,
	SakiSSOClient,
	compareUnicodeOrder,
	getInitials,
} from '@nyanyajs/utils'
import { MeowWhisperCoreSDK } from '../modules/MeowWhisperCoreSDK'
import { meowWhisperCore, sakisso } from '../config'
import { userAgent } from './user'
import { storage } from './storage'
import { alert, snackbar } from '@saki-ui/core'

export const modeName = 'contacts'

// export let meowWhisperCoreSDK: MeowWhisperCoreSDK | undefined

export interface FriendItem extends protoRoot.contact.IContact {
	userInfo: protoRoot.user.ISimpleAnonymousUserInfo | null | undefined
}

const state: {
	list: FriendItem[]
	isInit: boolean
	defaultContact: FriendItem
} = {
	list: [],
	isInit: false,
	defaultContact: {
		userInfo: {
			uid: '------',
			nickname: '------',
		},
	},
}
export const contactsSlice = createSlice({
	name: modeName,
	initialState: state,
	reducers: {
		init: (state, params: ActionParams<{}>) => {},
		setIsInit: (state, params: ActionParams<typeof state['isInit']>) => {
			state.isInit = params.payload
		},
		setContacts: (state, params: ActionParams<typeof state['list']>) => {
			state.list = params.payload
		},
	},
})

export const contactsMethods = {
	getContactList: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/getContactList', async (_, thunkAPI) => {
		const { mwc, user, contacts } = thunkAPI.getState()
		const getCoantacts = await mwc.sdk?.api.contact.getContactList()
		console.log('getCoantacts', user, getCoantacts)
		if (getCoantacts?.code === 200 && getCoantacts.data?.list?.length) {
			let list = getCoantacts.data.list.map((v) => {
				const u = v.users?.filter((v) => {
					return v.uid !== user.userInfo.uid
				})?.[0]?.userInfo

				return {
					...v,
					userInfo: u,
				}
			})
			list.sort((a, b) => {
				return compareUnicodeOrder(
					b.userInfo?.letter || '',
					a.userInfo?.letter || ''
				)
			})
			list.forEach((v) => {
				mwc.cache.userInfo?.set(v.userInfo?.uid || '', v)
			})
			thunkAPI.dispatch(contactsSlice.actions.setContacts(list))
		}
		thunkAPI.dispatch(contactsSlice.actions.setIsInit(true))
	}),
	deleteContact: createAsyncThunk<
		void,
		{
			uid: string
		},
		{
			state: RootState
		}
	>(modeName + '/deleteContact', async ({ uid }, thunkAPI) => {
		const { mwc, user, contacts } = thunkAPI.getState()

		alert({
			title: 'Delete',
			content: '确定删除此好友？',
			cancelText: 'Cancel',
			confirmText: 'Delete',
			onCancel() {},
			async onConfirm() {
				const res = await mwc.sdk?.api.contact.deleteContact({
					uid,
				})
				console.log(res, uid)
				let message = ''
				if (res?.code === 10105) {
					message = '已经不是好友了哦'
				} else if (res?.code === 200) {
					message = '删除成功！'
					thunkAPI.dispatch(
						contactsSlice.actions.setContacts(
							contacts.list.filter((v) => v.userInfo?.uid !== uid)
						)
					)
					thunkAPI.dispatch(configSlice.actions.setModalUserId(''))
				} else {
					message = '好友删除失败了，请重新尝试'
				}
				snackbar({
					message: message,
					autoHideDuration: 2000,
					vertical: 'top',
					horizontal: 'center',
					backgroundColor: 'var(--saki-default-color)',
					color: '#fff',
				}).open()
			},
		}).open()
	}),
	getContactInfo: createAsyncThunk<
		Promise<FriendItem | undefined>,
		{
			uid: string
		},
		{
			state: RootState
		}
	>(modeName + '/getContactInfo', async ({ uid }, thunkAPI) => {
		const { mwc, user, contacts } = thunkAPI.getState()

		const res = await mwc.sdk?.api.contact.searchContact({
			uid,
		})
		// console.log(res, uid)
		if (res?.code === 200) {
			if (res.data.isFriend) {
				let cListU = contacts.list.filter((v) => {
					return v.userInfo?.uid === uid
				})?.[0]
				return {
					...cListU,
					userInfo: res.data.userInfo,
				}
			}
			return {
				userInfo: res.data.userInfo,
			}
		} else {
			return undefined
		}
	}),
	addContact: createAsyncThunk<
		void,
		{
			uid: string
			remark: string
		},
		{
			state: RootState
		}
	>(modeName + '/addContact', async ({ uid, remark }, thunkAPI) => {
		const { mwc, user, contacts } = thunkAPI.getState()

		const add = await mwc.sdk?.api.contact.addContact({
			uid,
			remark,
		})
		console.log(add)
		let message = ''
		if (add?.code === 200) {
			message = '好友添加成功！'
			snackbar({
				message: message,
				horizontal: 'center',
				vertical: 'top',
				autoHideDuration: 2000,
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
			}).open()

			await thunkAPI.dispatch(contactsMethods.getContactList())
		}
  }),
	getUserCache: createAsyncThunk<
		void,
		string[],
		{
			state: RootState
		}
	>(modeName + '/getUserCache', async (uids, thunkAPI) => {
		const { mwc, user, contacts } = thunkAPI.getState()

		let list: string[] = []
    Array.from(new Set(uids)).forEach((v) => {
      if (!mwc.cache.userInfo.get(v)) {
				list = list.concat([v])
			}
		})
		console.log('uids', list)
		if (!list.length) return
		const res = await mwc.sdk?.api.contact.searchUserInfoList({
			uid: list,
		})
		console.log('getUser', res)
		if (res?.code === 200) {
			res.data.list?.forEach((v) => {
				mwc.cache.userInfo?.set(v.uid || '', {
					userInfo: v,
				})
			})
		}
	}),
}
