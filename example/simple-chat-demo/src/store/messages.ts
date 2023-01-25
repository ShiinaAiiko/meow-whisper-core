import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import md5 from 'blueimp-md5'
import store, {
	ActionParams,
	configSlice,
	contactsSlice,
	methods,
	RootState,
} from '.'
import { PARAMS, protoRoot } from '../protos'
import {
	WebStorage,
	SakiSSOClient,
	compareUnicodeOrder,
	getInitials,
	Debounce,
	deepCopy,
} from '@nyanyajs/utils'
import { MeowWhisperCoreSDK } from '../modules/MeowWhisperCoreSDK'
import { meowWhisperCore, sakisso } from '../config'
import { userAgent } from './user'
import { storage } from './storage'
import { alert, snackbar } from '@saki-ui/core'
import { room } from '../protos/proto'

export const modeName = 'messages'

// export let meowWhisperCoreSDK: MeowWhisperCoreSDK | undefined

export interface ChatDialogueItem extends protoRoot.message.IChatDialogue {
	roomId: string
	id: string
	unreadMessageCount: number
	type: 'Group' | 'Contact'
	showMessageContainer: boolean
	typingMessage?: string

	lastSeenTime?: number
	sort: number

	// activeRoomInfo用
	members?: number
}

export interface MessageItem extends protoRoot.message.IMessages {
	status: number
}

export interface MessagesMap {
	list: MessageItem[]
	status: 'loading' | 'loaded' | 'noMore'
	pageNum: number
	pageSize: number
	type: 'Group' | 'Contact'
}

const state: {
	recentChatDialogueList: ChatDialogueItem[]
	activeRoomIndex: number
	activeRoomInfo?: ChatDialogueItem
	getMessageStatus: 'GetSuccess' | 'Getting' | 'Waiting'
	messagesMap: {
		[roomId: string]: MessagesMap
	}
} = {
	recentChatDialogueList: [],
	activeRoomIndex: -1,
	getMessageStatus: 'Waiting',
	messagesMap: {},
}
export const messagesSlice = createSlice({
	name: modeName,
	initialState: state,
	reducers: {
		init: (state, params: ActionParams<{}>) => {},
		setRecentChatDialogueList: (
			state,
			params: ActionParams<typeof state['recentChatDialogueList']>
		) => {
			state.recentChatDialogueList = params.payload

			state.recentChatDialogueList.sort((a, b) => {
				return b.sort - a.sort
			})
		},
		setActiveRoomIndex: (
			state,
			params: ActionParams<typeof state['activeRoomIndex']>
		) => {
			state.activeRoomIndex = params.payload
			state.recentChatDialogueList[state.activeRoomIndex].showMessageContainer =
				true
		},
		setActiveRoomInfo: (
			state,
			params: ActionParams<typeof state['activeRoomInfo']>
		) => {
			state.activeRoomInfo = params.payload
		},
		setGetMessageStatus: (
			state,
			params: ActionParams<typeof state['getMessageStatus']>
		) => {
			state.getMessageStatus = params.payload
		},
		initMessageMap: (
			state,
			params: ActionParams<{
				roomId: string
				type: 'Group' | 'Contact'
			}>
		) => {
			const { roomId, type } = params.payload
			state.messagesMap[roomId] = {
				list: [],
				status: 'loaded',
				pageNum: 1,
				pageSize: 10,
				type,
			}
		},
		setMessageMapStatus: (
			state,
			params: ActionParams<{
				roomId: string
				value: typeof state['messagesMap']['status']['status']
			}>
		) => {
			const { roomId, value } = params.payload
			state.messagesMap[roomId].status = value
		},
		setMessageMapList: (
			state,
			params: ActionParams<{
				roomId: string
				list: MessageItem[]
				pageNum?: number
			}>
		) => {
			const { roomId, list, pageNum } = params.payload
			const v = state.messagesMap[roomId]
			pageNum && (v.pageNum = pageNum)
			v.list = list
		},
		setMessageItem: (
			state,
			params: ActionParams<{
				roomId: string
				messageId: string
				value: MessageItem
			}>
		) => {
			const { roomId, messageId, value } = params.payload
			const mv = state.messagesMap[roomId]
			mv.list.some((v, i) => {
				console.log(v.id, messageId, value)
				if (v.id === messageId) {
					mv.list[i] = {
						...value,
					}
					return true
				}
			})
			console.log(deepCopy(mv.list))
		},
		setDraft: (
			state,
			params: ActionParams<{
				index: number
				message: string
			}>
		) => {
			state.recentChatDialogueList[params.payload.index].typingMessage =
				params.payload.message
			// state.activeRoomInfo = params.payload
		},
	},
})

export const messagesMethods = {
	init: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/init', async (_, thunkAPI) => {
		const { mwc, contacts, group, user } = thunkAPI.getState()

		thunkAPI.dispatch(messagesSlice.actions.setGetMessageStatus('Getting'))
		await thunkAPI.dispatch(
			methods.messages.joinRoom(
				contacts.list
					.map((v) => {
						return v.id || ''
					})
					.concat(
						group.list.map((v) => {
							return v.id || ''
						})
					)
			)
		)
		await thunkAPI.dispatch(methods.messages.getAllUnreadMessage())
		// 更新群组和联系人缓存

		thunkAPI.dispatch(messagesSlice.actions.setGetMessageStatus('GetSuccess'))
	}),
	joinRoom: createAsyncThunk<
		void,
		string[],
		{
			state: RootState
		}
	>(modeName + '/joinRoom', async (roomIds, thunkAPI) => {
		const { mwc, contacts, group } = thunkAPI.getState()
		console.log('JoinRoom', contacts, group, roomIds)
		const res = await mwc.sdk?.api.message.joinRoom({
			roomIds: roomIds,
		})
		console.log('JoinRoom', res)
	}),
	setChatDialogue: createAsyncThunk<
		void,
		ChatDialogueItem,
		{
			state: RootState
		}
	>(modeName + '/setChatDialogue', async (dialog, thunkAPI) => {
		const { mwc, group, user, messages } = thunkAPI.getState()
		let ai = -1
		messages.recentChatDialogueList.some((v, i) => {
			if (v.roomId === dialog.roomId) {
				ai = i
				return true
			}
		})
		console.log(
			'setChatDialogue',
			dialog.roomId,
			dialog,
			messages.recentChatDialogueList,
			ai
		)
		if (ai === -1) {
			dialog.unreadMessageCount = 0
			thunkAPI.dispatch(
				messagesSlice.actions.setRecentChatDialogueList(
					[dialog].concat(messages.recentChatDialogueList)
				)
			)

			thunkAPI.dispatch(methods.messages.setActiveRoomIndex(0))
		} else {
			thunkAPI.dispatch(
				messagesSlice.actions.setRecentChatDialogueList(
					messages.recentChatDialogueList.map((v) => {
						if (v.roomId === dialog.roomId) {
							let t = {
								...v,
								...dialog,
								unreadMessageCount:
									dialog.unreadMessageCount === -1
										? v.unreadMessageCount + 1
										: dialog.unreadMessageCount,
							}
							if (v.roomId === messages.activeRoomInfo?.roomId) {
								t.unreadMessageCount = 0
							}
							t.id = v.id
							return t
						}
						return v
					})
				)
			)
		}
	}),

	getRecentChatDialogueList: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/getRecentChatDialogueList', async (_, thunkAPI) => {
		const { mwc, group, user } = thunkAPI.getState()
		const res = await mwc.sdk?.api.message.getRecentChatDialogueList()
		console.log('getRecentChatDialogueList res', res)
		if (res?.code === 200) {
			thunkAPI.dispatch(
				messagesSlice.actions.setRecentChatDialogueList(
					res.data?.list?.map<ChatDialogueItem>((v) => {
						if (v.type === 'Group') {
							return {
								...v,
								id: v.id || '',
								type: 'Group',
								showMessageContainer: false,
								roomId: v.roomId || '',
								unreadMessageCount: Number(v.unreadMessageCount) || 0,
								sort: Number(v.lastMessageTime) || 0,
							}
						}
						const uinfo = mwc.cache.userInfo.get(v.id || '')

						return {
							...v,
							id: v.id || '',
							type: 'Contact',
							showMessageContainer: false,
							roomId: v.roomId || '',
							unreadMessageCount: Number(v.unreadMessageCount) || 0,
							sort: Number(v.lastMessageTime) || 0,
						}
					}) || []
				)
			)
		}
	}),
	setActiveRoomIndex: createAsyncThunk<
		void,
		number,
		{
			state: RootState
		}
	>(modeName + '/setActiveRoomIndex', async (index, thunkAPI) => {
		const { mwc, group, messages } = thunkAPI.getState()
		const activeRoomIndex = index
		const activeRoomInfo: ChatDialogueItem = {
			...messages.recentChatDialogueList[activeRoomIndex],
		}
		console.log(
			'messages.recentChatDialogueList',
			messages.recentChatDialogueList
		)
		if (activeRoomInfo.type === 'Contact') {
			const uinfo = mwc.cache.userInfo.get(activeRoomInfo.id || '')
			activeRoomInfo.lastSeenTime = Number(uinfo.lastSeenTime) || -1
		}
		if (activeRoomInfo.type === 'Group') {
			const ginfo = mwc.cache.group.get(activeRoomInfo.id || '')
			activeRoomInfo.members = Number(ginfo.members) || 0
		}
		thunkAPI.dispatch(messagesSlice.actions.setActiveRoomIndex(activeRoomIndex))
		thunkAPI.dispatch(messagesSlice.actions.setActiveRoomInfo(activeRoomInfo))
	}),
	sendMessage: createAsyncThunk<
		void,
		{
			roomId: string
			id: string
			type: string
			message: string
			onMessageSentSuccessfully: () => void
		},
		{
			state: RootState
		}
	>(
		modeName + '/sendMessage',
		async (
			{ id, type, message, roomId, onMessageSentSuccessfully },
			thunkAPI
		) => {
			const { mwc, user, group, messages } = thunkAPI.getState()

			if (mwc.nsocketioStatus !== 'connected') {
				console.log('连接失败')
				return
			}
			if (!message) {
				console.log('未输入信息')
				return
			}
			console.log('sendMessage', id, type, message)

			let mid = md5(
				user.userInfo.uid + message + Math.floor(new Date().getTime() / 1000)
			)
			const v = messages.messagesMap[roomId]

			let m: MessageItem = {
				id: mid,
				authorId: user.userInfo.uid,
				message: message,

				createTime: Math.floor(new Date().getTime() / 1000),
				status: 0,
			}
			thunkAPI.dispatch(
				messagesSlice.actions.setMessageMapList({
					roomId,
					list: v.list.concat([m]),
				})
			)

			await thunkAPI.dispatch(
				methods.messages.setChatDialogue({
					roomId,
					type: type as any,
					id: '-1',
					showMessageContainer: true,
					unreadMessageCount: -1,
					lastMessage: m,
					lastMessageTime: Math.floor(new Date().getTime() / 1000),
					sort: Math.floor(new Date().getTime() / 1000),
				})
			)
			await thunkAPI.dispatch(methods.messages.setActiveRoomIndex(0))

			const res = await mwc.sdk?.api.message.sendMessage({
				roomId,
				type,
				authorId: user.userInfo.uid,
				message,
			})
			console.log('sendMessage', res)
			if (res?.code === 200 && res?.data?.message) {
				thunkAPI.dispatch(
					messagesSlice.actions.setMessageItem({
						roomId,
						messageId: mid,
						value: {
							...res.data.message,
							status: 1,
						},
					})
				)
			} else {
				thunkAPI.dispatch(
					messagesSlice.actions.setMessageItem({
						roomId,
						messageId: mid,
						value: {
							...m,
							status: -1,
						},
					})
				)
			}
			onMessageSentSuccessfully()
		}
	),
	// 预留
	getAllUnreadMessage: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/getAllUnreadMessage', async (_, thunkAPI) => {
		const { mwc, user, group, messages } = thunkAPI.getState()

		console.log('开始获取消息 getAllUnreadMessage')
		// 暂时不需要获取离线消息，暂时全在线
	}),
	getMessages: createAsyncThunk<
		void,
		{
			roomId: string
		},
		{
			state: RootState
		}
	>(modeName + '/getMessages', async ({ roomId }, thunkAPI) => {
		const { mwc, user, group, messages } = thunkAPI.getState()

		const mv = messages.messagesMap[roomId]

		console.log('开始获取消息 getMessage', roomId, mv.status)
		if (mv.status !== 'loaded') {
			return
		}

		thunkAPI.dispatch(
			messagesSlice.actions.setMessageMapStatus({
				roomId,
				value: 'loading',
			})
		)

		console.log('真正的开始获取', roomId, mv.status)
		// 暂时不需要获取离线消息，暂时全在线
		// 有离线之后则是从上次的开始
		const res = await mwc.sdk?.api.message.getHistoricalMessages({
			roomId,
			pageNum: 1,
			pageSize: mv.pageSize,
			type: mv.type,
			timeRange: {
				start: 1540947600,
				end:
					mv.list.length === 0
						? Math.floor(new Date().getTime() / 1000)
						: Number(mv.list[0].createTime) || 0,
			},
		})
		console.log('真正的开始获取2', roomId, res)
		if (res?.code === 200) {
			thunkAPI.dispatch(
				methods.contacts.getUserCache(
					res?.data?.list?.map((v) => {
						return v.authorId || ''
					}) || []
				)
			)
			thunkAPI.dispatch(
				messagesSlice.actions.setMessageMapList({
					roomId,
					list: (
						res?.data?.list?.map((v) => {
							return {
								...v,
								status: 1,
							}
						}) || []
					).concat(mv.list),
					pageNum: mv.pageNum + 1,
				})
			)
			if (res.data?.list?.length) {
				thunkAPI.dispatch(
					methods.messages.readMessages({
						roomId,
					})
				)
			}
			if (res.data.total === mv.pageSize) {
				thunkAPI.dispatch(
					messagesSlice.actions.setMessageMapStatus({
						roomId,
						value: 'loaded',
					})
				)
				return
			}
		}
		thunkAPI.dispatch(
			messagesSlice.actions.setMessageMapStatus({
				roomId,
				value: 'noMore',
			})
		)

		// thunkAPI.dispatch(messagesSlice.actions.setGetMessageStatus('GetSuccess'))
	}),
	readMessages: createAsyncThunk<
		void,
		{
			roomId: string
		},
		{
			state: RootState
		}
	>(modeName + '/readMessages', async ({ roomId }, thunkAPI) => {
		const { mwc, user, group, messages } = thunkAPI.getState()

		const mv = messages.messagesMap[roomId]
		const dialog = messages.recentChatDialogueList.filter((v) => {
			return v.roomId === roomId
		})?.[0]

		if (!dialog?.unreadMessageCount) return

		console.log(
			'开始阅读消息 readMessages',
			dialog?.unreadMessageCount,
			roomId,
			mv.status
		)
		thunkAPI.dispatch(
			methods.messages.setChatDialogue({
				...dialog,
				unreadMessageCount: 0,
			})
		)

		const res = await mwc.sdk?.api.message.readAllMessages({
			roomId,
		})
		console.log(res)
		if (res?.code === 200) {
			thunkAPI.dispatch(
				messagesSlice.actions.setMessageMapList({
					roomId: res.data.roomId || '',
					list: mv.list.map((v) => {
						return {
							...v,
							readUserIds: Array.from(
								new Set(v.readUserIds?.concat([res.data.uid || '']))
							),
						}
					}),
				})
			)
		}

		// thunkAPI.dispatch(messagesSlice.actions.setGetMessageStatus('GetSuccess'))
	}),
}
