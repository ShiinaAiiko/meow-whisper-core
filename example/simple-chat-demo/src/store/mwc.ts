import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import md5 from 'blueimp-md5'
import store, { ActionParams, methods, RootState } from '.'
import { PARAMS, protoRoot } from '../protos'
import { WebStorage, SakiSSOClient } from '@nyanyajs/utils'
import { MeowWhisperCoreSDK } from '../modules/MeowWhisperCoreSDK'
import { meowWhisperCore, sakisso } from '../config'
import { userAgent } from './user'
import { storage } from './storage'
import { snackbar } from '@saki-ui/core'
import { FriendItem } from './contacts'
import createSocketioRouter from '../modules/socketio/router'

export const modeName = 'mwc'

// export let meowWhisperCoreSDK: MeowWhisperCoreSDK | undefined
const state: {
	sdk?: MeowWhisperCoreSDK
	encryptionStatus: MeowWhisperCoreSDK['encryption']['status']
	nsocketioStatus: 'connecting' | 'connected' | 'disconnect' | 'notConnected'
	cache: {
		userInfo: ReturnType<typeof MeowWhisperCoreSDK.cache.new<FriendItem>>
		group: ReturnType<
			typeof MeowWhisperCoreSDK.cache.new<protoRoot.group.IGroup>
		>
	}
} = {
	nsocketioStatus: 'notConnected',
	encryptionStatus: 'fail',
	cache: {
		userInfo: MeowWhisperCoreSDK.cache.new<FriendItem>({
			label: 'UserInfo',
		}),
		group: MeowWhisperCoreSDK.cache.new<protoRoot.group.IGroup>({
			label: 'GroupInfo',
		}),
	},
}
export const mwcSlice = createSlice({
	name: modeName,
	initialState: state,
	reducers: {
		init: (state, params: ActionParams<{}>) => {},
		setNsocketioStatus: (
			state,
			params: ActionParams<typeof state['nsocketioStatus']>
		) => {
			state.nsocketioStatus = params.payload
		},
		setEncryptionStatus: (
			state,
			params: ActionParams<typeof state['encryptionStatus']>
		) => {
			state.encryptionStatus = params.payload
		},
		setSDK: (state, params: ActionParams<typeof state['sdk']>) => {
			state.sdk = params.payload
		},
	},
})

export const mwcMethods = {
	Init: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/Init', (_, thunkAPI) => {
		const { config, mwc } = thunkAPI.getState()
		let meowWhisperCoreSDK = new MeowWhisperCoreSDK({
			url: meowWhisperCore.url,
			appId: meowWhisperCore.appId,
			// appKey: meowWhisperCore.appKey,
			encryptionApi: true,
			publicRsa: {
				publicKey:
					thunkAPI.getState().config.encryptionConfiguration.publicRsa
						.publicKey,
			},
			storage: storage.global,
			socketIoConfig: {
				uri: meowWhisperCore.url,
				opts: config.socketIoConfig.opt,
			},
		})
		thunkAPI.dispatch(mwcSlice.actions.setSDK(meowWhisperCoreSDK))

		meowWhisperCoreSDK.on('encryption-status', (s) => {
			store.dispatch(mwcSlice.actions.setEncryptionStatus(s))
		})
		meowWhisperCoreSDK.on('response', (res) => {
			let message = ''
			switch (res.code) {
				case 10302:
					message = '非创建人'
					break
				case 10308:
					message = 'Failed to disband the group'
					break
				case 10307:
					message = '已加入过该群组了'
					break
				case 10306:
					message = '该群组不存在'
					break
				case 10305:
					message = '已不是该群组的成员了'
					break
				case 10304:
					message = '群组离开失败'
					break
				case 10303:
					message = '群组加入失败'
					break
				case 10302:
					message = '非创建人'
					break
				case 10107:
					message = '好友已存在'
					break
				case 10013:
					message = '路由不存在'
					break
				case 10002:
					message = '参数错误'
					break

				default:
					break
			}

			if (message !== '') {
				snackbar({
					message: message,
					autoHideDuration: 2000,
					vertical: 'top',
					horizontal: 'center',
					backgroundColor: 'var(--saki-default-color)',
					color: '#fff',
				}).open()
			}
		})

		meowWhisperCoreSDK.nsocketio.on('connected', () => {
			store.dispatch(mwcSlice.actions.setNsocketioStatus('connected'))
		})
		meowWhisperCoreSDK.nsocketio.on('connecting', () => {
			store.dispatch(mwcSlice.actions.setNsocketioStatus('connecting'))
		})
		meowWhisperCoreSDK.nsocketio.on('disconnect', () => {
			store.dispatch(mwcSlice.actions.setNsocketioStatus('disconnect'))
		})

		createSocketioRouter.createRouter()

		// meowWhisperCoreSDK.nsocketio.onConnect = () => {
		// 	thunkAPI.dispatch(mwcSlice.actions.setNsocketioStatus('connect'))
		// }
		// meowWhisperCoreSDK.nsocketio.onConnecting = () => {
		// 	thunkAPI.dispatch(mwcSlice.actions.setNsocketioStatus('connecting'))
		// }
		// meowWhisperCoreSDK.nsocketio.onDisconnect = () => {
		// 	thunkAPI.dispatch(mwcSlice.actions.setNsocketioStatus('disconnect'))
		// }
	}),
}
