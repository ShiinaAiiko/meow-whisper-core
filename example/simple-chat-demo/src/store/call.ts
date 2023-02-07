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
import * as Ion from 'ion-sdk-js/lib/connector'
import { MeowWhisperCoreSDK } from '../modules/MeowWhisperCoreSDK'
import { meowWhisperCore, sakisso } from '../config'
import { userAgent } from './user'
import { storage } from './storage'
import { alert, snackbar } from '@saki-ui/core'
import { room } from '../protos/proto'
import {
	SFUClient,
	SFUSignal,
	SFUStream,
} from '../modules/MeowWhisperCoreSDK/ionSfuSdk'

export let callAlert: ReturnType<typeof alert> | undefined
export let setCallAlert = (b: typeof callAlert) => {
	callAlert = b
}

export const modeName = 'call'

const state: {
	enable: boolean
	options: {
		type: 'Audio' | 'Video' | 'ScreenShare'
		callToken: string
		uid: string
		roomId: string
		participatingUsers: {
			uid: string
			caller: boolean
		}[]
		turnServer: protoRoot.message.ITurnServer
	}
	modal: {
		showSmallWindow: boolean
	}
	signal?: SFUSignal
	client?: SFUClient
	mediaDevices: {
		list: {
			deviceId: string
			groupId: string
			kind: MediaDeviceKind
			label: string
			subtitle: string
		}[]
		activeVideoDevice: string
		activeAudioDevice: string
	}
	deviceStatus: {
		video: boolean
		audio: boolean
		screenShare: boolean
	}
	streams: {
		isMain: boolean
		isMinimize: boolean
		stream?: SFUStream
		userInfo: {
			[k: string]: any
		}
	}[]
	/**
   *  -3 未通话
	 -2 正在挂断
	 -1 正在拨打未接通
	 0 正在接通
	 1 接通完成
   */
	status: number
	time: {
		startTime: number
		currentTime: number
	}
	sound: ReturnType<typeof MeowWhisperCoreSDK.sound>
} = {
	enable: false,
	modal: {
		showSmallWindow: false,
	},
	status: -2,
	options: {
		type: 'Audio',
		callToken: '',
		uid: '',
		participatingUsers: [],
		roomId: '',
		turnServer: {},
	},
	mediaDevices: {
		list: [],
		activeAudioDevice: '',
		activeVideoDevice: '',
	},
	deviceStatus: {
		video: false,
		audio: false,
		screenShare: false,
	},
	streams: [],
	time: {
		startTime: 0,
		currentTime: 0,
	},
	sound: MeowWhisperCoreSDK.sound('/call.mp3'),
}
export const callSlice = createSlice({
	name: modeName,
	initialState: state,
	reducers: {
		init: (state, params: ActionParams<{}>) => {},
		start: (state, params: ActionParams<typeof state['options']>) => {
			if (state.enable) {
				snackbar({
					message: '正在通话中~',
					autoHideDuration: 2000,
					vertical: 'top',
					horizontal: 'center',
					backgroundColor: 'var(--saki-default-color)',
					color: '#fff',
				}).open()
				return
			}
			state.deviceStatus.audio = false
			state.deviceStatus.video = false
			state.deviceStatus.screenShare = false

			state.enable = true
			state.modal.showSmallWindow = false
			state.options = params.payload
		},
		// -2 未通话
		// -1 挂断
		// 0 正在接通
		// 1 接通完成
		setStatus: (state, params: ActionParams<typeof state['status']>) => {
			state.status = params.payload
			console.log('setStatus', params.payload)
		},
		setModal: (
			state,
			params: ActionParams<{
				type: keyof typeof state['modal']
				value: boolean
			}>
		) => {
			state.modal[params.payload.type] = params.payload.value
		},
		setTime: (
			state,
			params: ActionParams<{
				type: keyof typeof state['time']
				value: number
			}>
		) => {
			state.time[params.payload.type] = params.payload.value
		},
		setDeviceStatus: (
			state,
			params: ActionParams<{
				type: keyof typeof state['deviceStatus']
				value: boolean
			}>
		) => {
			console.log('setDeviceStatus', params)
			state.deviceStatus[params.payload.type] = params.payload.value
		},
		setSignal: (state, params: ActionParams<typeof state['signal']>) => {
			state.signal = params.payload
			if (state.signal) {
				state.signal.on('open', () => {
					console.log('setSignal open')
				})
				state.signal.on('error', (e) => {
					console.log('setSignal error', e)
				})
				state.signal.on('close', (e) => {
					const { call } = store.getState()
          console.log('setSignalclose', e, call)
          // 未接通就关闭的情况下
					if (call.status === -1) {
						snackbar({
							message: '与通话服务器失去了联系',
							autoHideDuration: 2000,
							vertical: 'top',
							horizontal: 'center',
							backgroundColor: 'var(--saki-default-color)',
							color: '#fff',
						}).open()
					}
				})
			}
		},
		setClient: (state, params: ActionParams<typeof state['client']>) => {
			state.client = params.payload
		},
		setMediaDevicesList: (
			state,
			params: ActionParams<typeof state['mediaDevices']['list']>
		) => {
			state.mediaDevices.list = params.payload
		},
		setActiveVideoDevice: (
			state,
			params: ActionParams<typeof state['mediaDevices']['activeVideoDevice']>
		) => {
			state.mediaDevices.activeVideoDevice = params.payload
		},
		setActiveAudioDevice: (
			state,
			params: ActionParams<typeof state['mediaDevices']['activeAudioDevice']>
		) => {
			state.mediaDevices.activeAudioDevice = params.payload
		},
		switchDevice: (
			state,
			params: ActionParams<{
				index: number
				deviceId: string
			}>
		) => {
			let deviceType: 'video' | 'audio' | 'screenShare' = 'video'

			const index = params.payload.index
			const deviceId = params.payload.deviceId
			if (
				!state.mediaDevices.list[index] ||
				state.mediaDevices.list[index].label ===
					state.mediaDevices.activeAudioDevice ||
				state.mediaDevices.list[index].label ===
					state.mediaDevices.activeVideoDevice
			)
				return
			switch (state.mediaDevices.list[index].kind) {
				case 'audioinput':
					deviceType = 'audio'
					state.mediaDevices.activeAudioDevice =
						state.mediaDevices.list[index].label
					break
				case 'videoinput':
					deviceType = 'video'
					state.mediaDevices.activeVideoDevice =
						state.mediaDevices.list[index].label
					break

				default:
					break
			}
			console.log(deepCopy(state.mediaDevices))
			state.streams.some((v) => {
				if (v.stream?.type === 'Local') {
					v.stream.switchDevice(deviceType, deviceId)
					return true
				}
			})
		},
		setStreams: (state, params: ActionParams<typeof state['streams']>) => {
			const streams = params.payload
			state.streams = streams
		},
		removeStream: (state, params: ActionParams<SFUStream>) => {
			const stream = params.payload

			if (
				!stream?.stream?.getTracks().filter((t) => t.readyState === 'live')
					.length
			) {
				if (stream.type === 'Local' && stream?.callType === 'ScreenShare') {
					state.deviceStatus.screenShare = false
				}
				state.streams = state.streams.filter(
					(s) => s.stream && s.stream.id !== stream.id
				)
				if (state.streams.length) {
					state.streams[0].isMain = true
				}
			}
		},
		addStream: (state, params: ActionParams<SFUStream>) => {
			const stream = params.payload

			let isExist = false
			state.streams.some((s, i) => {
				if (s.userInfo.uid === stream.clientInfo.userInfo.uid) {
					if (s.stream && s.stream.callType !== stream.callType) {
						return false
					}
					isExist = true
					state.streams[i].stream = stream
					return true
				}
			})
			if (!isExist) {
				state.streams.push({
					isMain: state.streams.filter((v) => v.isMain).length
						? false
						: stream.type === 'Local',
					isMinimize: false,
					stream: stream,
					userInfo: stream.clientInfo.userInfo,
				})
			}
		},
		switchMainVideoStream: (state, params: ActionParams<string>) => {
			state.streams.forEach((s, i) => {
				if ((params.payload || '') === s.stream?.id) {
					state.streams[i].isMain = true
				} else {
					state.streams[i].isMain = false
				}
			})
		},
		minimize: (state, _: ActionParams<void>) => {
			state.streams.some((s) => {
				if (s.isMain) {
					s.isMinimize = true
					return true
				}
			})
			state.modal.showSmallWindow = true
		},
		maximize: (state, _: ActionParams<void>) => {
			state.streams.some((s) => {
				if (s.isMain) {
					s.isMinimize = true
					return true
				}
			})
			state.modal.showSmallWindow = false
		},
		hangup: (state, _: ActionParams<void>) => {
			state.options = {
				type: 'Audio',
				callToken: '',
				uid: '',
				participatingUsers: [],
				roomId: '',
				turnServer: {},
			}
			state.enable = false
			state.modal.showSmallWindow = false
			// 开始挂断
			state.status = -1

			// 对方挂断后就-2
			state.status = -2
			state.time.currentTime = 0
			state.time.startTime = 0
			state.signal?.close()
			state.streams = []
		},

		publish: (
			state,
			params: ActionParams<'Audio' | 'Video' | 'ScreenShare'>
		) => {
			const type = params.payload

			if (type === 'ScreenShare') {
				const callOptions: Ion.Constraints = {
					audio: true,
					// video: false,
					video: { width: 1280, height: 720, frameRate: 15 },
					// audio: false,
					// video: false,
					codec: 'vp8',
					resolution: 'hd',
					simulcast: false, // enable simulcast
				}
				state.client
					?.publish(callOptions, 'ScreenShare')
					.then((ls) => {
						console.log(ls)
					})
					.catch((err) => {
						snackbar({
							message: '设备获取失败，无法进行屏幕分享',
							autoHideDuration: 2000,
							vertical: 'top',
							horizontal: 'center',
							backgroundColor: 'var(--saki-default-color)',
							color: '#fff',
						}).open()
						store.dispatch(callSlice.actions.switchScreenShare(false))

						switch (err.code) {
							case 8:
								console.error('找不到设备')
								break

							default:
								break
						}
						console.log(err)
					})
			} else {
				const callOptions: Ion.Constraints = {
					audio: true,
					// video: false,
					video: { width: 1280, height: 720, frameRate: 15 },
					// audio: false,
					// video: false,
					codec: 'vp8',
					resolution: 'hd',
					simulcast: false, // enable simulcast
				}
				console.log('callOptions', callOptions)
				state.client
					?.publish(callOptions, type)
					.then((ls) => {
						console.log(ls)
					})
					.catch((err) => {
						switch (type) {
							case 'Audio':
								store.dispatch(callSlice.actions.switchAudio(false))

								break
							case 'Video':
								store.dispatch(callSlice.actions.switchVideo(false))

								break

							default:
								break
						}
						snackbar({
							message: '设备获取失败，无法进行获取媒体数据',
							autoHideDuration: 2000,
							vertical: 'top',
							horizontal: 'center',
							backgroundColor: 'var(--saki-default-color)',
							color: '#fff',
						}).open()
						switch (err.code) {
							case 8:
								console.error('找不到设备')
								break

							default:
								break
						}
						console.log(err)
					})
			}
		},
		switchScreenShare: (state, params: ActionParams<boolean>) => {
			const bool = params.payload
			state.deviceStatus.screenShare = bool

			let isExist = false
			state.streams.some((s) => {
				if (
					s.stream &&
					s.stream.type === 'Local' &&
					s.stream.callType === 'ScreenShare'
				) {
					isExist = true
					if (!bool) {
						s.stream.unpublish()
					}
					// if (bool) {
					// 	v.stream.stream.unmute('audio')
					// } else {
					// 	v.stream.stream.mute('audio')
					// }
					return true
				}
			})
			if (bool && !isExist) {
				setTimeout(() => {
					store.dispatch(callSlice.actions.publish('ScreenShare'))
				})
			}
		},
		switchAudio: (state, params: ActionParams<boolean>) => {
			const bool = params.payload
			state.deviceStatus.audio = bool
			// console.log('switchAudio', bool)

			let isExist = false
			state.streams.some((v) => {
				if (
					v.stream &&
					v.stream.type === 'Local' &&
					(v.stream.callType === 'Video' || v.stream.callType === 'Audio')
				) {
					isExist = true
					if (bool) {
						v.stream.unmute('audio')
					} else {
						v.stream.mute('audio')
					}
					return true
				}
			})
			if (bool && !isExist) {
				setTimeout(() => {
					store.dispatch(callSlice.actions.publish('Audio'))
				})
			}
		},
		switchVideo: (state, params: ActionParams<boolean>) => {
			const bool = params.payload
			state.deviceStatus.video = bool

			let isExist = false
			state.streams.some((v) => {
				// console.log({ ...v.stream }, v.stream.stream, bool)
				if (
					v.stream &&
					v.stream?.type === 'Local' &&
					(v.stream.callType === 'Video' || v.stream.callType === 'Audio')
				) {
					isExist = true
					if (bool) {
						v.stream.unmute('video')
						// 开启视频时，如果有共享屏幕则会失效

						state.streams.some((v) => {
							if (
								v.stream &&
								v.stream?.type === 'Local' &&
								v.stream?.callType === 'ScreenShare'
							) {
								if (bool) {
									v.stream?.stream.getTracks().some((track) => {
										if (
											track.kind === 'video' &&
											track.readyState === 'ended'
										) {
											v.stream?.unpublish()
											return true
										}
									})
								}
								return true
							}
						})
					} else {
						v.stream.mute('video')
					}
					return true
				}
			})

			if (bool && !isExist) {
				setTimeout(() => {
					store.dispatch(callSlice.actions.publish('Video'))
				})
			}
		},
	},
})

export const callMethods = {
	init: createAsyncThunk<
		void,
		void,
		{
			state: RootState
		}
	>(modeName + '/init', async (_, thunkAPI) => {
		const { mwc, contacts, group, user } = thunkAPI.getState()

		// setDeleteDialogIds
	}),
	addStream: createAsyncThunk<
		void,
		SFUStream,
		{
			state: RootState
		}
	>(modeName + '/addStream', async (stream, thunkAPI) => {
		// setDeleteDialogIds

		thunkAPI.dispatch(callSlice.actions.addStream(stream))

		const { call, mwc, contacts, group, user } = thunkAPI.getState()

		// if (
		// 	stream.clientInfo.uid !== user.userInfo.uid &&
		// 	call.status === 0 &&
		// 	call.streams.filter((s) => s.stream).length >= 2
		// ) {
		// 	setStartTimestamp(Math.floor(new Date().getTime() / 1000))

		// 	queueloop.increase('setCallCurrentTimestamp', setCallCurrentTimestamp, {
		// 		loop: true,
		// 	})

		// 	// callModal.setCallStartTimestamp()
		// 	// queueloop.decrease('waiting')

		// 	dispatch(callSlice.actions.setStatus(1))
		// }

		if (stream.type === 'Local') {
			if (stream.callType !== 'ScreenShare') {
				const videoTracks = stream.stream
					.getVideoTracks()
					.filter((v) => v.readyState === 'live')
				const audioTracks = stream.stream
					.getAudioTracks()
					.filter((v) => v.readyState === 'live')

				thunkAPI.dispatch(
					callSlice.actions.setDeviceStatus({
						type: 'video',
						value: !!videoTracks?.length,
					})
				)
				thunkAPI.dispatch(
					callSlice.actions.setDeviceStatus({
						type: 'audio',
						value: !!audioTracks?.length,
					})
				)
			} else {
				const videoTracks = stream.stream
					.getVideoTracks()
					.filter((v) => v.readyState === 'live')

				thunkAPI.dispatch(
					callSlice.actions.setDeviceStatus({
						type: 'screenShare',
						value: !!videoTracks?.length,
					})
				)
			}
			// console.log('setDeviceStatus', stream.stream.getTracks())
		}

		const trackEvent = (track: MediaStreamTrack) => {
			// if (!track.enabled) return
			track.addEventListener('mute', () => {
				console.log('mute', stream)
				console.log(stream.stream.getTracks())
				if (stream.type === 'Local' && stream.callType !== 'ScreenShare') {
					switch (track.kind) {
						case 'video':
							store.dispatch(
								callSlice.actions.setDeviceStatus({
									type: 'video',
									value: false,
								})
							)

							break
						case 'audio':
							store.dispatch(
								callSlice.actions.setDeviceStatus({
									type: 'audio',
									value: false,
								})
							)

							break

						default:
							break
					}
				}
			})
			track.addEventListener('unmute', () => {
				console.log('unmute', stream)
				if (stream.type === 'Local' && stream.callType !== 'ScreenShare') {
					switch (track.kind) {
						case 'video':
							store.dispatch(
								callSlice.actions.setDeviceStatus({
									type: 'video',
									value: true,
								})
							)
							break
						case 'audio':
							store.dispatch(
								callSlice.actions.setDeviceStatus({
									type: 'audio',
									value: true,
								})
							)

							break

						default:
							break
					}
				}
			})
			track.onended = (e) => {
				console.log('sfu onended', e)
				if (track.kind === 'video') {
					console.log('sfu onmute', e)
				}
			}
			track.addEventListener('ended', (e) => {
				console.log('sfu onended', e)
				if (track.kind === 'video') {
					console.log('sfu onmute', e)
				}
			})
		}
		stream.stream.addEventListener('addtrack', (e) => {
			console.log('addtrack', e.track)
			trackEvent(e.track)
		})
		stream.addEventListener('removetrack', (e) => {
			console.log('onremovetrack', e, stream.id, stream?.stream?.getTracks())
			setTimeout(() => {
				thunkAPI.dispatch(callSlice.actions.removeStream(stream))
			})
		})
		stream.stream.getTracks().forEach((track) => {
			console.log('getTracks()', stream, track)
			if (stream.type === 'Local') {
				switch (stream.callType) {
					case 'ScreenShare':
						// call.activeScreenShareDevice = track.label
						// callModal.screenShareIsOn =
						// 	track.enabled && track.readyState === 'live' && !track.muted

						break

					default:
						switch (track.kind) {
							case 'video':
								store.dispatch(
									callSlice.actions.setActiveVideoDevice(track.label)
								)
								// callModal.startVideo =
								// 	track.enabled &&
								// 	track.readyState === 'live' &&
								// 	!track.muted

								// if (
								// 	callObjectInfo.value.type === 'Video' &&
								// 	!callModal.startVideo
								// ) {
								// 	callModal.switchVideo(true)
								// }
								// 如若音频通话则禁止掉
								// if (callObjectInfo.value.type === 'audio') {
								// 	callModal.switchVideo(false)
								// }
								break
							case 'audio':
								store.dispatch(
									callSlice.actions.setActiveAudioDevice(track.label)
								)
								// console.log(
								// 	'aaaaaudio',
								// 	track,
								// 	track.enabled &&
								// 		track.readyState === 'live' &&
								// 		!track.muted
								// )
								// call.activeAudioDevice = track.label

								// callModal.micIsOn =
								// 	track.enabled &&
								// 	track.readyState === 'live' &&
								// 	!track.muted

								break
						}
						break
				}
			}
			trackEvent(track)
		})
	}),

	startCalling: createAsyncThunk<
		void,
		{
			roomId: string
			callToken: string
			type: 'Audio' | 'Video' | 'ScreenShare'
			participants: protoRoot.message.IMessagesCallParticipants[]
			turnServer: protoRoot.message.ITurnServer
		},
		{
			state: RootState
		}
	>(
		modeName + '/startCalling',
		async ({ roomId, callToken, type, turnServer, participants }, thunkAPI) => {
			const { mwc, call, user, group, messages } = thunkAPI.getState()

			if (callAlert || call.status === 0) {
				if (call.status === 0) {
				}
				snackbar({
					message: '有一个新的电话',
					autoHideDuration: 2000,
					vertical: 'top',
					horizontal: 'center',
					backgroundColor: 'var(--saki-default-color)',
					color: '#fff',
				}).open()
				// 未来这里要发请求，告诉对方挂断
				return
				thunkAPI.dispatch(methods.call.hangup(true))
				return
			}

			const mv = messages.messagesMap[roomId]
			const dialog = messages.recentChatDialogueList.filter((v) => {
				return v.roomId === roomId
			})?.[0]

			console.log('-----------开始语音信息 callMessage------------')
			console.log(type, roomId)
			console.log(deepCopy(dialog), deepCopy(mv))

			let authorId = ''
			let isIncluded = false

			participants.forEach((v) => {
				if (v.caller) {
					authorId = v.uid || ''
				}
				if (v.uid === authorId) {
					isIncluded = true
				}
			})
			if (!isIncluded) {
				return
			}

			if (authorId !== user.userInfo.uid) {
				const info = mwc.cache.userInfo.get(authorId)
				let title = ''
				let content = ''
				switch (mwc.sdk?.methods.getType(roomId)) {
					case 'Contact':
						title = type + '邀请'
						content = info.userInfo?.nickname + '发起了一个' + type
						break
					case 'Group':
						title = type + '邀请'
						content = info.userInfo?.nickname + '发起了一个' + type
						break

					default:
						break
				}
				// call.sound.play()
				callAlert = alert({
					titleAvatar: info.userInfo?.avatar || '',
					titleAvatarText: info.userInfo?.nickname || '',
					title,
					content,
					cancelText: 'Decline',
					confirmText: 'Accept',
					async onCancel() {
						callAlert = undefined
						call.sound.stop()

						thunkAPI.dispatch(methods.call.hangup(true))
					},
					onConfirm() {
						callAlert = undefined
						call.sound.stop()
						thunkAPI.dispatch(
							callSlice.actions.start({
								type,
								roomId,
								callToken,
								uid: user.userInfo.uid,
								participatingUsers:
									participants?.map((v) => {
										return {
											uid: v.uid || '',
											caller: v.caller || false,
										}
									}) || [],
								turnServer,
							})
						)
					},
				})
				callAlert.open()
				return
			}
			thunkAPI.dispatch(
				callSlice.actions.start({
					type,
					roomId,
					callToken,
					uid: user.userInfo.uid,
					participatingUsers:
						participants?.map((v) => {
							return {
								uid: v.uid || '',
								caller: v.caller || false,
							}
						}) || [],
					turnServer,
				})
			)
			// thunkAPI.dispatch(
			// 	methods.messages.setChatDialogue({
			// 		...dialog,
			// 		unreadMessageCount: 0,
			// 	})
			// )
		}
	),

	hangup: createAsyncThunk<
		void,
		boolean,
		{
			state: RootState
		}
	>(modeName + '/hangup', async (sendMessage, thunkAPI) => {
		const { mwc, call, contacts, group, user } = thunkAPI.getState()
		let status = 1
		switch (call.status) {
			// 正在通话的时候挂断
			case 0:
				status = 1
				break
			// 正在拨打的时候挂断
			case -1:
				status = -1
				break

			default:
				break
		}
		if (callAlert && call.status === -1) {
			status = 0
		}
		console.log(
			' call.client?.streams',
			call.status,
			call.client?.streams,
			sendMessage,
			call.options.roomId &&
				call.client?.streams &&
				Object.keys(call.client?.streams).length
		)
		if (
			call.options.roomId &&
			call.client?.streams &&
			sendMessage &&
			Object.keys(call.client?.streams).length
		) {
			// 发送消息

			console.log(call.time.currentTime, call.time.startTime)
			thunkAPI.dispatch(
				methods.messages.sendMessage({
					roomId: call.options.roomId,
					call: {
						status,
						roomId: call.options.roomId,
						participants: call.options.participatingUsers,
						type: call.options.type,
						time: call.time.currentTime - call.time.startTime || 0,
					},
				})
			)
		}
		// console.log(call.status, status)
		call.status !== -2 && thunkAPI.dispatch(callSlice.actions.hangup())
		sendMessage &&
			(await mwc.sdk?.api.message.hangup({
				roomId: call.options.roomId,
				type: call.options.type,
				participants: call.options.participatingUsers,
				status: status,
				callTime: call.time.currentTime - call.time.startTime || 0,
			}))
	}),
}
