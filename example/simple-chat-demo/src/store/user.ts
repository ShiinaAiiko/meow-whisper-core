import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import md5 from 'blueimp-md5'
import store, { ActionParams, methods, storageSlice, RootState } from '.'
import { UserAgent } from '@nyanyajs/utils/dist/userAgent'
import nyanyajs from '@nyanyajs/utils'

// import { WebStorage } from './ws'
import { storage } from './storage'
import { getI18n } from 'react-i18next'

import { stringify } from 'querystring'
import { resolve } from 'path'
import { nanoid } from 'nanoid'
import { client } from './sso'
import { AnonymousUserInfo, defaultValue } from '../modules/sakisso'

export const modeName = 'user'

export const userMethods = {
	Init: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/Init', async (_, thunkAPI) => {
		// 获取配置
		// console.log(await storage.config.get('language'))
		// thunkAPI.dispatch(userSlice.actions.setInit(false))
		const { user, config, sso } = thunkAPI.getState()
		const token = await storage.global.get('token')
		const deviceId = await storage.global.get('deviceId')
		const userInfo = await storage.global.get('userInfo')
		if (token) {
			await thunkAPI.dispatch(
				userMethods.login({
					token: token,
					deviceId: deviceId,
					userInfo: userInfo,
					type: 'LoggedIn',
				})
			)
			// 改到布局文件里
			// await thunkAPI
			// 	.dispatch(
			// 		methods.user.checkToken({
			// 			appToken: sso.appToken,
			// 			token,
			// 			deviceId,
			// 		})
			// 	)
			// 	.unwrap()
		} else {
			thunkAPI.dispatch(userSlice.actions.logout({}))
		}
		thunkAPI.dispatch(userSlice.actions.setInit(true))
	}),
	checkToken: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/checkToken', async (_, thunkAPI) => {
		try {
			console.log('校验token是否有效')
			const { user, config, sso } = thunkAPI.getState()
			if (!user.token || !user.deviceId || !sso.appToken) {
				return
			}
			const res = await client?.anonymousUser.verifyUserToken({
				appToken: sso.appToken,
				token: user.token,
				deviceId: user.deviceId,
			})
			console.log('res checkToken', res)
			if (res === 10029) {
				thunkAPI.dispatch(userSlice.actions.logout({}))
				await thunkAPI.dispatch(methods.sso.GetAppToken())
				// await thunkAPI.dispatch(methods.user.checkToken()).unwrap()
			} else if (res === 10004) {
				thunkAPI.dispatch(userSlice.actions.logout({}))
			} else if (res) {
				console.log('登陆成功')
				await thunkAPI.dispatch(
					userMethods.login({
						token: res.token,
						deviceId: res.deviceId,
						userInfo: res.userInfo,
						type: 'LoggedIn',
					})
				)
				thunkAPI.dispatch(userSlice.actions.setIsLogin(true))
			}
		} catch (error) {}
	}),

	login: createAsyncThunk<
		void,
		{
			token: string
			deviceId: string
			userInfo: AnonymousUserInfo
			type: 'NewLogin' | 'LoggedIn'
		},
		{
			state: RootState
		}
	>(modeName + '/login', async (params, thunkAPI) => {
		const { mwc } = thunkAPI.getState()
		const { token, deviceId, type, userInfo } = params

		if (token) {
			thunkAPI.dispatch(
				userSlice.actions.login({
					token: token || '',
					deviceId: deviceId || '',
					userInfo: userInfo || Object.assign({}, userInfo),
				})
			)

			storage.global.setSync('token', token)
			storage.global.setSync('deviceId', deviceId)
			storage.global.setSync('userInfo', userInfo)

			mwc.cache.userInfo?.set(userInfo?.uid || '', {
				userInfo: userInfo,
			})

			mwc.sdk?.setToken(token)
			mwc.sdk?.setDeviceId(deviceId)

			if (type === 'NewLogin') {
				await mwc.sdk?.encryption.clear()
				await mwc.sdk?.encryption.init()
				thunkAPI.dispatch(userSlice.actions.setIsLogin(true))
				thunkAPI.dispatch(methods.sso.GetAppToken())
			}
			thunkAPI.dispatch(storageSlice.actions.init(userInfo.uid))
		}
	}),
}

export let userInfo = defaultValue.anonymousUserInfo
export let userAgent = nyanyajs.userAgent(window.navigator.userAgent)
export const userSlice = createSlice({
	name: modeName,
	initialState: {
		userAgent: {
			...userAgent,
		},
		token: '',
		deviceId: '',
		userInfo,
		isLogin: false,
		isInit: false,
	},
	reducers: {
		setInit: (state, params: ActionParams<boolean>) => {
			state.isInit = params.payload
		},
		setIsLogin: (state, params: ActionParams<boolean>) => {
			state.isLogin = params.payload
		},
		login: (
			state,
			params: ActionParams<{
				token: string
				deviceId: string
				userInfo: AnonymousUserInfo
			}>
		) => {
			const { token, deviceId, userInfo } = params.payload
			state.token = token || ''
			state.deviceId = deviceId || ''
			state.userInfo = userInfo || Object.assign({}, userInfo)
		},
		logout: (state, _) => {
			storage.global.delete('token')
			storage.global.delete('deviceId')
			storage.global.delete('userInfo')
			state.token = ''
			state.deviceId = ''
			state.userInfo = Object.assign({}, userInfo)
			state.isLogin = false
			setTimeout(() => {
				const { mwc } = store.getState()
				mwc.sdk?.setToken('')
				mwc.sdk?.setDeviceId('')
				store.dispatch(storageSlice.actions.init(''))
			})
		},
	},
})
