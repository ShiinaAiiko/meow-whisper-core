import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import md5 from 'blueimp-md5'
import store, { ActionParams, methods } from '.'
// import { WebStorage } from './ws'
import { WebStorage } from '@nyanyajs/utils'
import { storage } from './storage'
import { getI18n } from 'react-i18next'

import { stringify } from 'querystring'
import axios from 'axios'
import { resolve } from 'path'
import { nanoid } from 'nanoid'
import { sakisso, nsocketio, version, origin, meowWhisperCore } from '../config'

export const modeName = 'config'

export const configMethods = {
	Init: createAsyncThunk(modeName + '/Init', async (_, thunkAPI) => {
		// 获取配置
		store.dispatch(methods.config.getDeviceType())
		store.dispatch(methods.config.initLanguage())
		await thunkAPI.dispatch(methods.config.GetPublicRsaPbk()).unwrap()
		// store.dispatch(methods.config.initAutoCloseWindowAfterCopy())
		// store.dispatch(methods.config.initSync())
		// store.dispatch(methods.config.initBackup())
	}),
	GetPublicRsaPbk: createAsyncThunk(
		modeName + '/GetPublicRsaPbk',
		async (_, thunkAPI) => {
			await storage.global.getAndSet('publicRsaPbk', async (v) => {
				if (!v) {
					const res = await axios({
						method: 'GET',
						url: meowWhisperCore.rsa.publicKeyStaticUrl,
					})
					if (res.data) {
						await storage.global.set('publicRsaPbk', res.data)
						thunkAPI.dispatch(configSlice.actions.setPublicRsaPbk(res.data))
						return res.data
					}
				}
				thunkAPI.dispatch(configSlice.actions.setPublicRsaPbk(v))
				return v
			})
		}
	),
	getDeviceType: createAsyncThunk(
		modeName + '/getDeviceType',
		(_, thunkAPI) => {
			console.log('getDeviceType', window.innerWidth)

			if (window.innerWidth < 768) {
				thunkAPI.dispatch(configSlice.actions.setDeviceType('Mobile'))
				return
			}
			if (window.innerWidth < 1024 && window.innerWidth >= 768) {
				thunkAPI.dispatch(configSlice.actions.setDeviceType('Pad'))
				return
			}
			thunkAPI.dispatch(configSlice.actions.setDeviceType('PC'))
		}
	),
	initLanguage: createAsyncThunk(
		modeName + '/initLanguage',
		async (_, thunkAPI) => {
			store.dispatch(
				configSlice.actions.setLanguage({
					language: (await storage.systemConfig.get('language')) || 'system',
				})
			)
		}
	),
	initAutoCloseWindowAfterCopy: createAsyncThunk(
		modeName + '/initLanguage',
		async (_, thunkAPI) => {
			store.dispatch(
				configSlice.actions.setAutoCloseWindowAfterCopy(
					JSON.parse(
						await storage.systemConfig.get('autoCloseWindowAfterCopy')
					) || false
				)
			)
		}
	),
	initSync: createAsyncThunk(modeName + '/initSync', async (_, thunkAPI) => {
		store.dispatch(
			configSlice.actions.setSync(
				JSON.parse(await storage.systemConfig.get('sync')) || false
			)
		)
	}),
	initBackup: createAsyncThunk(
		modeName + '/initBackup',
		async (_, thunkAPI) => {
			thunkAPI.dispatch(
				configSlice.actions.setBackup({
					type: 'storagePath',
					v: (await storage.systemConfig.get('backupStoragePath')) || '',
				})
			)
			thunkAPI.dispatch(
				configSlice.actions.setBackup({
					type: 'backupAutomatically',
					v:
						JSON.parse(await storage.systemConfig.get('backupAutomatically')) ||
						false,
				})
			)
			thunkAPI.dispatch(
				configSlice.actions.setBackup({
					type: 'keepBackups',
					v: (await storage.systemConfig.get('keepBackups')) || '3784320000',
				})
			)
			thunkAPI.dispatch(
				configSlice.actions.setBackup({
					type: 'automaticBackupFrequency',
					v:
						(await storage.systemConfig.get('automaticBackupFrequency')) ||
						'604800',
				})
			)
		}
	),
	getLastBackupTime: createAsyncThunk(
		modeName + '/initBackup',
		async (_, thunkAPI) => {
			thunkAPI.dispatch(
				configSlice.actions.setBackup({
					type: 'lastBackupTime',
					v: (await storage.systemConfig.get('lastBackupTime')) || 0,
				})
			)
		}
	),
}

export let platform: 'Electron' | 'Web' =
	window &&
	window.process &&
	window.process.versions &&
	window.process.versions['electron']
		? 'Electron'
		: 'Web'

export let eventTarget = new EventTarget()

type DeviceType = 'Mobile' | 'Pad' | 'PC'
export let deviceType: DeviceType | undefined

let initialState = {
	layout: {
		backIcon: false,
		showCenter: false,
		centerTitle: {
			title: '',
			subtitle: '',
		},
	},
	saassConfig: {
		parameters: {
			imageResize: {
				normal: '?x-saass-process=image/resize,900,70',
				avatar: '?x-saass-process=image/resize,160,70',
				full: '?x-saass-process=image/resize,1920,70',
			},
		},
	},
	pageConfig: {
		disableChangeValue: false,
		settingPage: {
			settingType: '',
		},
		indexPage: {
			mobile: {
				showNotesListPage: true,
				showCategoryListPage: true,
				showPageListPage: false,
				showPageContentPage: false,
			},
		},
	},
	version: version,
	isDev: process.env.NODE_ENV === 'development',
	networkStatus: window.navigator.onLine,
	origin: origin,
	language: '',
	deviceType,
	sync: false,
	backup: {
		storagePath: '',
		backupAutomatically: false,
		automaticBackupFrequency: '-1',
		keepBackups: '-1',
		maximumStorageSpace: 512 * 1024 * 1024,
		lastBackupTime: 0,
	},
	platform,
	status: {
		noteInitStatus: false,
		sakiUIInitStatus: false,
		syncStatus: false,
		loginModalStatus: false,
	},
	sakisso,
	socketIoConfig: {
		// uri: 'http://192.168.0.103:15301',
		uri: nsocketio.url,
		opt: {
			reconnectionDelay: 2000,
			reconnectionDelayMax: 5000,
			secure: false,
			autoConnect: true,
			rejectUnauthorized: false,
			transports: ['websocket'],
		},
	},
	general: {
		autoCloseWindowAfterCopy: false,
		openLoginUserDropDownMenu: false,
	},
	encryptionConfiguration: {
		publicRsa: {
			publicKey: '',
		},
	},
	isConnectionError: {
		mobile: false,
		pc: false,
	},
	modal: {
		groupId: '',
		userId: '',
	},
	count: {
		messages: 0,
		contacts: 0,
		notifications: 0,
	},
}

export const configSlice = createSlice({
	name: modeName,
	initialState: initialState,
	reducers: {
		setLanguage: (
			state,
			params: ActionParams<{
				language: string
			}>
		) => {
			state.language = params.payload.language
			// console.log('state.language', state.language)
			if (state.language === 'system') {
				const languages = ['zh-CN', 'zh-TW', 'en-US']
				if (languages.indexOf(navigator.language) >= 0) {
					getI18n().changeLanguage(navigator.language)
				} else {
					switch (navigator.language.substring(0, 2)) {
						case 'zh':
							getI18n().changeLanguage('zh-CN')
							break
						case 'en':
							getI18n().changeLanguage('en-US')
							break

						default:
							getI18n().changeLanguage('en-US')
							break
					}
				}
			} else {
				getI18n().changeLanguage(state.language)
			}
			storage.systemConfig.setSync('language', state.language)
		},
		setSync: (state, params: ActionParams<boolean>) => {
			state.sync = params.payload
			storage.systemConfig.setSync('sync', JSON.stringify(params.payload))
		},
		setSettingType: (state, params: ActionParams<string>) => {
			state.pageConfig.settingPage.settingType = params.payload
		},
		setDisableChangeValue: (state, params: ActionParams<boolean>) => {
			state.pageConfig.disableChangeValue = params.payload
			params.payload &&
				setTimeout(() => {
					store.dispatch(configSlice.actions.setDisableChangeValue(false))
				}, 300)
		},

		setHeaderCenter: (state, params: ActionParams<boolean>) => {
			state.layout.showCenter = params.payload
			console.log('setHeaderCenter', state.layout.showCenter)
		},
		setHeaderCenterTitle: (
			state,
			params: ActionParams<{
				title: string
				subtitle: string
			}>
		) => {
			state.layout.centerTitle = params.payload
		},
		setDeviceType: (state, params: ActionParams<DeviceType>) => {
			state.deviceType = params.payload
		},
		setLayoutBackIcon: (state, params: ActionParams<boolean>) => {
			state.layout.backIcon = params.payload
		},

		setStatus: (
			state,
			params: ActionParams<{
				type:
					| 'noteInitStatus'
					| 'sakiUIInitStatus'
					| 'syncStatus'
					| 'loginModalStatus'
				v: boolean
			}>
		) => {
			state.status[params.payload.type] = params.payload.v
		},
		setBackup: (
			state: any,
			params: ActionParams<{
				type: keyof typeof initialState.backup
				v: any
			}>
		) => {
			state.backup[params.payload.type] = params.payload.v
			switch (params.payload.type) {
				case 'storagePath':
					storage.systemConfig.setSync('backupStoragePath', params.payload.v)
					break
				case 'backupAutomatically':
					storage.systemConfig.setSync(
						'backupAutomatically',
						JSON.stringify(params.payload.v)
					)
					break

				case 'keepBackups':
					storage.systemConfig.setSync('keepBackups', params.payload.v)
					break

				case 'automaticBackupFrequency':
					storage.systemConfig.setSync(
						'automaticBackupFrequency',
						params.payload.v
					)
					break

				default:
					break
			}
		},
		setAutoCloseWindowAfterCopy: (state, params: ActionParams<boolean>) => {
			state.general.autoCloseWindowAfterCopy = params.payload
			storage.systemConfig.setSync(
				'autoCloseWindowAfterCopy',
				JSON.stringify(params.payload)
			)
		},
		setNetworkStatus: (state, params: ActionParams<boolean>) => {
			state.networkStatus = params.payload
		},
		setOpenLoginUserDropDownMenu: (state, params: ActionParams<boolean>) => {
			state.general.openLoginUserDropDownMenu = params.payload
		},
		setPublicRsaPbk: (state, params: ActionParams<string>) => {
			state.encryptionConfiguration.publicRsa.publicKey = params.payload
		},
		setIsConnectionError: (
			state,
			params: ActionParams<typeof initialState['isConnectionError']>
		) => {
			state.isConnectionError = params.payload
		},
		setModalGroupId: (
			state,
			params: ActionParams<typeof initialState['modal']['groupId']>
		) => {
			state.modal.groupId = params.payload
		},
		setModalUserId: (
			state,
			params: ActionParams<typeof initialState['modal']['userId']>
		) => {
			state.modal.userId = params.payload
		},
		setCount: (
			state,
			params: ActionParams<{
				type: keyof typeof initialState['count']
				value: number
			}>
		) => {
			state.count[params.payload.type] = params.payload.value
		},
	},
})
