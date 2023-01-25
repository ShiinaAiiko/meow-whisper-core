import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import md5 from 'blueimp-md5'
import store, { ActionParams, configSlice, RootState } from '.'
import { PARAMS, protoRoot } from '../protos'
import { WebStorage, SakiSSOClient, LocalCache } from '@nyanyajs/utils'
import { MeowWhisperCoreSDK } from '../modules/MeowWhisperCoreSDK'
import { meowWhisperCore, sakisso } from '../config'
import { userAgent } from './user'
import { storage } from './storage'
import { alert, snackbar } from '@saki-ui/core'

export const modeName = 'group'

export interface GroupCache {}

// export let meowWhisperCoreSDK: MeowWhisperCoreSDK | undefined

const state: {
	list: protoRoot.group.IGroup[]
	isInit: boolean
	// 不删除 只新增
	mapList: {
		[k: string]: protoRoot.group.IGroup
	}
} = {
	list: [],
	isInit: false,
	mapList: {},
}
export const groupSlice = createSlice({
	name: modeName,
	initialState: state,
	reducers: {
		init: (state, params: ActionParams<{}>) => {},

		setIsInit: (state, params: ActionParams<typeof state['isInit']>) => {
			state.isInit = params.payload
		},
		setGroup: (state, params: ActionParams<typeof state['list']>) => {
			state.list = params.payload
			state.list.forEach((v) => {
				state.mapList[v.id || ''] = v
			})
		},
	},
})

export const groupMethods = {
	getGroupList: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/getGroupList', async (_, thunkAPI) => {
		const { mwc, user, group } = thunkAPI.getState()
		const getGroupList = await mwc.sdk?.api.group.getAllJoinedGroups()
		console.log('getGroupList', user, getGroupList)
		if (getGroupList?.code === 200 && getGroupList.data?.list?.length) {
			getGroupList.data.list.forEach((v) => {
				mwc.cache.group?.set(v.id || '', v)
			})
			thunkAPI.dispatch(groupSlice.actions.setGroup(getGroupList.data.list))
		}
		thunkAPI.dispatch(groupSlice.actions.setIsInit(true))
	}),
	disbandGroup: createAsyncThunk<
		void,
		{
			groupId: string
		},
		{
			state: RootState
		}
	>(modeName + '/disbandGroup', async ({ groupId }, thunkAPI) => {
		const { mwc, user, group } = thunkAPI.getState()

		alert({
			title: '解散',
			content: '确定解散该群组？',
			cancelText: 'Cancel',
			confirmText: 'Disband',
			onCancel() {},
			async onConfirm() {
				const res = await mwc.sdk?.api.group.disbandGroup({
					groupId,
				})
				console.log(res)
				if (res?.code === 200) {
					snackbar({
						message: '已解散该群组',
						autoHideDuration: 2000,
						vertical: 'top',
						horizontal: 'center',
						backgroundColor: 'var(--saki-default-color)',
						color: '#fff',
					}).open()

					thunkAPI.dispatch(
						groupSlice.actions.setGroup(
							group.list.filter((v) => v.id !== groupId)
						)
					)
					thunkAPI.dispatch(configSlice.actions.setModalGroupId(''))
				}
			},
		}).open()
	}),
	leaveGroup: createAsyncThunk<
		void,
		{
			groupId: string
		},
		{
			state: RootState
		}
	>(modeName + '/leaveGroup', async ({ groupId }, thunkAPI) => {
		const { mwc, group, user } = thunkAPI.getState()

		alert({
			title: '离开',
			content: '确定离开该群组？',
			cancelText: 'Cancel',
			confirmText: 'Leave',
			onCancel() {},
			async onConfirm() {
				const res = await mwc.sdk?.api.group.leaveGroup({
					groupId,
					uid: user.userInfo.uid,
				})
				console.log(res)
				if (res?.code === 200) {
					snackbar({
						message: '已离开该群组',
						autoHideDuration: 2000,
						vertical: 'top',
						horizontal: 'center',
						backgroundColor: 'var(--saki-default-color)',
						color: '#fff',
					}).open()
					thunkAPI.dispatch(
						groupSlice.actions.setGroup(
							group.list.filter((v) => v.id !== groupId)
						)
					)
					thunkAPI.dispatch(configSlice.actions.setModalGroupId(''))
				}
			},
		}).open()
	}),
	joinGroup: createAsyncThunk<
		boolean,
		{
			groupId: string
			uid: string
			remark: string
		},
		{
			state: RootState
		}
	>(modeName + '/joinGroup', async ({ groupId, uid, remark }, thunkAPI) => {
		const { mwc, group, user } = thunkAPI.getState()
		// 预留 检测是否需要校验，需要则出输入备注的弹框

		const add = await mwc.sdk?.api.group.joinGroup({
			groupId,
			uid,
			remark,
		})
		console.log(add)
		if (add?.code === 200) {
			snackbar({
				message: '加入成功!',
				horizontal: 'center',
				vertical: 'top',
				autoHideDuration: 2000,
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
			}).open()
			thunkAPI.dispatch(groupMethods.getGroupList())
		}

		return add?.code === 200
	}),
}
