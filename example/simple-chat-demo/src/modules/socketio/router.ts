import store, {
	callSlice,
	messagesSlice,
	methods,
	toolsSlice,
} from '../../store'
import { protoRoot, socketio } from '../../protos'
import socketApi from './api'
import md5 from 'blueimp-md5'
import nyanyalog from 'nyanyajs-log'
import { RouterType } from '../MeowWhisperCoreSDK/mwc-nsocketio'
import {
	interceptors,
	Response,
	ResponseData,
	protobuf,
} from '@nyanyajs/utils/dist/request'
import { RSA, DiffieHellman, deepCopy } from '@nyanyajs/utils'
import { room } from '../../protos/proto'
import { snackbar } from '@saki-ui/core'
import { callAlert, setCallAlert } from '../../store/call'
import { getDialogueInfo } from '../methods'
// import { e2eeDecryption } from './common'
// import { getDialogRoomUsers } from '../../store/modules/chat/methods'

export const createSocketioRouter = {
	createRouter() {
		const { nsocketio, mwc, api, config, messages } = store.getState()

		mwc.sdk?.nsocketio.on<RouterType['router-receiveMessage']>(
			'router-receiveMessage',
			async (v) => {
				console.log('router-receiveMessage', v)
				if (v?.code === 200) {
					const { mwc, messages, user, config } = store.getState()

					const m = v.data.message
					const roomId = v.data.message?.roomId
					if (!roomId) return

					// store.dispatch(
					// 	messagesSlice.actions.setChatDialogue({
					//     roomId,
					// 		showMessageContainer: false,
					// 	})
					// )

					const mv = messages.messagesMap[roomId]
					console.log('mv', mv, roomId, deepCopy(messages.messagesMap))

					if (!mv) {
						store.dispatch(
							messagesSlice.actions.initMessageMap({
								roomId,
								type: mwc.sdk?.methods.getType(roomId) as any,
							})
						)
					}
					store.dispatch(
						messagesSlice.actions.setMessageMapList({
							roomId,
							list: (mv?.list || []).concat([
								{
									...v.data.message,
									status: 1,
								},
							]),
						})
					)
					await store.dispatch(
						methods.messages.setChatDialogue({
							roomId,
							type: mwc.sdk?.methods.getType(m?.roomId || 'G') as any,
							id: m?.authorId || '',
							showMessageContainer: true,
							unreadMessageCount: -1,
							lastMessage: m,
							lastMessageTime: Math.floor(new Date().getTime() / 1000),
							sort: Math.floor(new Date().getTime() / 1000),
						})
					)
					// await store.dispatch(methods.messages.setActiveRoomIndex(0))

					// console.log("messages.activeRoomInfo?.roomId === roomId",messages.activeRoomInfo?.roomId === roomId)
					if (messages.activeRoomInfo?.roomId === roomId) {
						store.dispatch(
							methods.messages.readMessages({
								roomId,
							})
						)
					}

					// 让用户选择通知级别
					console.log(
						'notification',
						config.notification.leval === 1
							? true
							: config.notification.leval === 0
							? !config.inApp
							: false
					)
					if (
						config.notification.leval === 1
							? true
							: config.notification.leval === 0
							? !config.inApp
							: false
					) {
						const dialog = messages.recentChatDialogueList.filter(
							(v) => v.roomId === roomId
						)?.[0]
						const dialogInfo = getDialogueInfo(dialog)
						const userInfo = mwc.cache?.userInfo?.get(m?.authorId || '')
						console.log(21312, m, userInfo)
						store.dispatch(
							methods.tools.sendNotification({
								title: dialogInfo.name,
								body:
									userInfo.userInfo?.nickname +
									':' +
									mwc?.sdk?.methods?.getLastMessage(
										m,
										m?.authorId === user.userInfo.uid
									),
								icon: dialogInfo.avatar || '',
								sound:
									config.notification.sound >= 0
										? config.notification.sound === 0
											? !config.inApp
											: true
										: false,
							})
						)
					}
				}
			}
		)

		mwc.sdk?.nsocketio.on<RouterType['router-readAllMessages']>(
			'router-readAllMessages',
			(res) => {
				console.log('router-readAllMessages', res)
				if (res?.code === 200) {
					const { mwc, messages } = store.getState()
					const roomId = res.data.roomId || ''
					const mv = messages.messagesMap[roomId]

					const dialog = messages.recentChatDialogueList.filter((sv) => {
						return sv.roomId === roomId
					})?.[0]

					store.dispatch(
						methods.messages.setChatDialogue({
							...dialog,
							unreadMessageCount: 0,
							sort: -1,
						})
					)
					store.dispatch(
						messagesSlice.actions.setMessageMapList({
							roomId: roomId,
							list: mv.list.map((v) => {
								return {
									...v,
									readUsers:
										v.authorId !== res.data.uid
											? v.readUsers
													?.filter((v) => {
														return v.uid !== res.data.uid || ''
													})
													?.concat([
														{
															uid: res.data.uid || '',
														},
													])
											: v.readUsers,
								}
							}),
						})
					)
				}
			}
		)

		mwc.sdk?.nsocketio.on<RouterType['router-startCallingMessage']>(
			'router-startCallingMessage',
			async (res) => {
				console.log('router-startCallingMessage', res)
				if (res?.code === 200) {
					const { mwc, messages } = store.getState()
					await store.dispatch(
						methods.call.startCalling({
							roomId: res.data.roomId || '',
							callToken: res.data.callToken || '',
							type: res.data.type as any,
							participants: res.data.participants || [],
							turnServer: res.data.turnServer || {},
						})
					)
				}
			}
		)

		mwc.sdk?.nsocketio.on<RouterType['router-hangupMessage']>(
			'router-hangupMessage',
			async (res) => {
				console.log('router-hangupMessage', res)
				if (res?.code === 200) {
					const { mwc, messages, user, call } = store.getState()

					const authorId =
						res.data?.participants?.filter((v) => {
							return v.caller
						})?.[0]?.uid || ''
					callAlert?.close()
					setCallAlert(undefined)
					call.sound.stop()
					if (authorId === user.userInfo.uid) {
						if (
							(res.data.status = 0) &&
							call.options.roomId !== res.data.roomId
						) {
							snackbar({
								message: '对方正在通话',
								autoHideDuration: 2000,
								vertical: 'top',
								horizontal: 'center',
								backgroundColor: 'var(--saki-default-color)',
								color: '#fff',
							}).open()
						}
					}
					store.dispatch(methods.call.hangup(false))
				}
			}
		)

		mwc.sdk?.nsocketio.on<RouterType['router-deleteMessages']>(
			'router-deleteMessages',
			async (res) => {
				console.log('router-deleteMessages', res)
				if (res?.code === 200) {
					const { mwc, messages, user, call } = store.getState()

					store.dispatch(
						methods.messages.deleteLocalMessages({
							roomId: res.data.roomId || '',
							messageIdList: res.data.messageIdList || [],
							uid: res.data.uid || '',
						})
					)
				}
			}
		)

		mwc.sdk?.nsocketio.on('router-error', (v) => {
			console.log('router-error', v)
		})

		// client?.routerGroup(namespace.sync).router({
		// 	eventName: NSocketIoEventNames.v1.SyncData,
		// 	func: socketio.ResponseDecode<protoRoot.sync.SyncData.IResponse>(
		// 		(res) => {
		// 			// console.log('SyncData', res)
		//       console.log("------SyncData------")
		// 			if (res.data.code === 200) {
		// 				if (config.sync) {
		// 					store.dispatch(notesMethods.SyncData(res.data.data))
		// 				}
		// 			}
		// 			// const res = socketio.ResponseDecode<protoRoot.sync.SyncData.IResponse>(
		// 			// 	response,
		// 			// 	protoRoot.sync.SyncData.Response
		// 			// )
		// 		},
		// 		protoRoot.sync.SyncData.Response
		// 	),
		// })
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.readMessage,
		// 		func: async (response) => {
		// 			// console.log('readMessage原数据', response)
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.chat.ReadChatRecords.Response>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.chat.ReadChatRecords.Response
		// 				)
		// 			nyanyalog.info('ReadMessage', res)
		// 			// console.log('ChatMessage', res?.data?.code, res?.data?.data?.msg)
		// 			if (res?.data?.code === 200) {
		// 				res?.data?.data.list.forEach((item) => {
		// 					store.commit('chat/readMessage', {
		// 						id: item.id,
		// 						uid: item.friendId,
		// 						groupId: item.groupId,
		// 						readUserIds: item.readUserIds,
		// 					})
		// 				})
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.startCallingMessage,
		// 		func: (response) => {
		// 			// console.log('StartCallingMessage原数据', response)
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.chat.StartCalling.Response>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.chat.StartCalling.Response
		// 				)
		// 			console.log('StartCallingMessage', res)
		// 			if (res?.data?.code === 200) {
		// 				store.commit('chat/startCall', {
		// 					participants: res?.data?.data?.participants,
		// 					authorId: res?.data?.data?.authorId,
		// 					groupId: res?.data?.data?.groupId,
		// 					type: res?.data?.data?.type,
		// 					roomId: res?.data?.data?.roomId,
		// 				})
		// 				// 未来改成发了就展示，发送失败给个提示即可
		// 				// if (res?.data?.data?.uid === state.user.userInfo.uid) {
		// 				// }
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.hangupMessage,
		// 		func: (response) => {
		// 			// console.log('HangupMessage原数据', response)
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.chat.Hangup.Response>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.chat.Hangup.Response
		// 				)
		// 			console.log(
		// 				'HangupMessage',
		// 				JSON.parse(JSON.stringify(store.state.chat.call.callObject)),
		// 				res?.data
		// 				// res?.data?.data.toUids.filter(
		// 				// 	(item) => res?.data?.data.fromUid !== item
		// 				// ).length
		// 			)
		// 			// 如果对方关闭了，查看当前流的情况来关闭

		// 			// if (
		// 			// 	res?.data?.code === 200 &&
		// 			// 	res?.data?.data.participants.filter(
		// 			// 		(item) => res?.data?.data.authorId !== item.uid
		// 			// 	).length >= 1 &&
		// 			// 	store.state.chat.call.callObject.roomId === res?.data?.data.roomId
		// 			// ) {
		// 			// 	res?.data?.data?.participants.some((item) => {
		// 			// 		if (item.uid === store.state.user.userInfo.uid) {
		// 			// 			store.commit('chat/hangupCall', true)
		// 			// 			return true
		// 			// 		}
		// 			// 	})
		// 			// }
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.addFriend,
		// 		func: (response) => {
		// 			// console.log('AddFriend原数据', response)
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.friendLog.AddFriend.Response>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.friendLog.AddFriend.Response
		// 				)
		// 			console.log('AddFriend', res?.data?.data)
		// 			if (res?.data?.code === 200) {
		// 				store.commit('count/increaseNotification', 1)
		// 				store.state.friends.handlers.addFriendsHandlers.forEach((func) => {
		// 					func(res?.data?.data)
		// 				})
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.agreeFriend,
		// 		func: (response) => {
		// 			console.log('AgreeFriend原数据', response)
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.friendLog.AgreeFriend.Response>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.friendLog.AgreeFriend.Response
		// 				)
		// 			console.log('AgreeFriend', res?.data?.data)
		// 			if (res?.data?.code === 200) {
		// 				store.state.friends.handlers.agreeFriendHandlers.forEach((func) => {
		// 					func(res?.data?.data)
		// 				})
		// 				// store.state.friends.addFriendsHandlers.forEach((func) => {
		// 				//   func(res?.data?.data)
		// 				// })
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.disagreeFriend,
		// 		func: (response) => {
		// 			console.log('disagreeFriend原数据', response)
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.friendLog.DisagreeFriend.Response>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.friendLog.DisagreeFriend.Response
		// 				)
		// 			console.log('disagreeFriend', res?.data?.data)
		// 			if (res?.data?.code === 200) {
		// 				store.state.friends.handlers.disagreeFriendHandlers.forEach(
		// 					(func) => {
		// 						func(res?.data?.data)
		// 					}
		// 				)
		// 				// store.state.friends.addFriendsHandlers.forEach((func) => {
		// 				//   func(res?.data?.data)
		// 				// })
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.deleteFriend,
		// 		func: (response) => {
		// 			console.log('deleteFriend原数据', response)
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.friends.DeleteFriend.IResponse>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.friends.DeleteFriend.Response
		// 				)
		// 			console.log('deleteFriend', res?.data?.data)
		// 			if (res?.data?.code === 200) {
		// 				store.dispatch('friends/deleteFriend', res.data?.data?.friendId)
		// 				// store.state.friends.handlers.disagreeFriendHandlers.forEach(
		// 				// 	(func) => {
		// 				// 		func(res?.data?.data)
		// 				// 	}
		// 				// )
		// 				// store.state.friends.addFriendsHandlers.forEach((func) => {
		// 				//   func(res?.data?.data)
		// 				// })
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.leaveRoom,
		// 		func: (response) => {
		// 			console.log('leaveRoom', response)
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.room.LeaveRoom.IResponse>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.room.LeaveRoom.Response
		// 				)
		// 			console.log('leaveRoom', res?.data?.data)
		// 			if (res?.data?.code === 200) {
		// 				store.state.chat.chatDialogList.list.some((dialog) => {
		// 					if (
		// 						dialog.isAnonymous &&
		// 						dialog.customData?.roomInfo?.roomId === res.data.data.roomId
		// 					) {
		// 						if (dialog.isE2ee) {
		// 							store.commit('chat/updateChatDialogE2EE', {
		// 								invitationCode: dialog.customData?.invitationCode || '',
		// 								aesKey: '',
		// 								rsaPublicKey: '',
		// 							})
		// 						}
		// 						store.dispatch('chat/updateAndSaveDialog', {
		// 							isInit: true,
		// 							customData: {
		// 								invitationCode: dialog.customData?.invitationCode,
		// 								roomInfo: {
		// 									roomUsers: dialog.customData.roomInfo.roomUsers.map(
		// 										(v) => {
		// 											return {
		// 												...v,
		// 												isOnline:
		// 													v.uid === res.data.data.anonymousUID
		// 														? false
		// 														: true,
		// 											}
		// 										}
		// 									),
		// 								},
		// 							},
		// 						})

		// 						// 删除e2ee信息
		// 						return true
		// 					}
		// 				})
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.joinRoom,
		// 		func: (response) => {
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.room.JoinRoom.IResponse>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.room.JoinRoom.Response
		// 				)
		// 			console.log('joinRoom', res?.data?.data)
		// 			if (res?.data?.code === 200 && res.data?.data?.list?.length) {
		// 				res.data.data.list.forEach(async (u) => {
		// 					await store.dispatch('user/setUserCache', u)
		// 				})
		// 				store.state.chat.chatDialogList.list.some((dialog) => {
		// 					if (
		// 						dialog.customData?.roomInfo?.roomId === res.data.data.roomId
		// 					) {
		// 						console.log(
		// 							dialog.customData.roomInfo.roomUsers,
		// 							res?.data?.data
		// 						)
		// 						store.dispatch('chat/updateAndSaveDialog', {
		// 							isInit: true,
		// 							customData: {
		// 								invitationCode: dialog.customData?.invitationCode,
		// 								roomInfo: {
		// 									...dialog.customData.roomInfo,
		// 									roomUsers: getDialogRoomUsers(
		// 										dialog.customData.roomInfo.roomUsers,
		// 										res.data.data?.list?.map((v) => {
		// 											return {
		// 												uid: v.uid,
		// 												isOnline: true,
		// 												loginTime: Math.floor(new Date().getTime() * 1000),
		// 												lastSeenTime: -1,
		// 											}
		// 										}) || []
		// 									),
		// 								},
		// 							},
		// 						})

		// 						store.dispatch(
		// 							'secretChat/startE2eeEncryption',
		// 							dialog.customData.invitationCode
		// 						)
		// 						return true
		// 					}
		// 				})
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.onAnonymousMessage,
		// 		func: async (response) => {
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.secretChat.OnAnonymousMessage.IResponse>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.secretChat.OnAnonymousMessage.Response
		// 				)
		// 			console.log('SendMessageWithAnonymousRoom Router', res?.data)
		// 			if (res?.data?.code === 200) {
		// 				let data = JSON.parse(res.data?.data?.data || '{}')
		// 				switch (res.data.data.apiName) {
		// 					case 'E2eeReEncrypt':
		// 						// console.log('E2EE加密 重新进行')
		// 						const getE2ee = await store.state.storage.e2ee.get(
		// 							res.data?.data?.invitationCode || ''
		// 						)
		// 						console.log('reen', res.data?.data?.invitationCode, getE2ee)
		// 						// e2ee不存在的时候
		// 						// e2ee没有RSA但是有aeskey的时候
		// 						if (!getE2ee || (getE2ee?.aesKey && !getE2ee?.rsaPublicKey)) {
		// 							store.state.storage.e2ee.delete(
		// 								res.data?.data?.invitationCode || ''
		// 							)
		// 							store.dispatch(
		// 								'secretChat/startE2eeEncryption',
		// 								res.data?.data?.invitationCode || ''
		// 							)
		// 						}
		// 						break
		// 					case 'SendE2eeDHPublicKey':
		// 						const { privateKey, publicKey, sign } =
		// 							await store.state.storage.rsaKey.getAndSet(
		// 								'rsakey',
		// 								async (v) => {
		// 									if (!v?.privateKey) {
		// 										const rk = await RSA.getRsaKey()
		// 										return {
		// 											privateKey: rk.privateKey,
		// 											publicKey: rk.publicKey,
		// 											sign: RSA.getSign(rk.privateKey, rk.publicKey),
		// 										}
		// 									}
		// 									return v
		// 								}
		// 							)
		// 						if (!privateKey || !publicKey || !sign) {
		// 							// console.log('E2EE加密失败', res.data?.data?.invitationCode)
		// 							return
		// 						}
		// 						const dhData = JSON.parse(RSA.decrypt(privateKey, data.dhkey))

		// 						// const info = await store.state.storage.anonymousInfo.get(
		// 						// 	res.data?.data?.invitationCode || ''
		// 						// )
		// 						const e2ee = store.state.storage.e2ee.getSync(
		// 							res.data?.data?.invitationCode || ''
		// 						)
		// 						if (data.uid === state.user.currentLogin.anonymousUid) {
		// 							// console.log(
		// 							// 	'房主这里的key',
		// 							// 	v.e2ee?.dh?.generateSecretKey(dhData.publicKey.external)
		// 							// )
		// 							store.dispatch('secretChat/setE2eeAESKey', {
		// 								invitationCode: res.data?.data?.invitationCode || '',
		// 								dhkey: e2ee?.dh?.generateSecretKey(
		// 									dhData.publicKey.external
		// 								),
		// 							})
		// 							return
		// 						}
		// 						const dh = new DiffieHellman({
		// 							prime: dhData.prime,
		// 							base: dhData.base,
		// 							publicKey: {
		// 								external: dhData.publicKey.external,
		// 							},
		// 						})
		// 						// console.log('非房主这里的key', dh.generateSecretKey())
		// 						store.dispatch('secretChat/setE2eeAESKey', {
		// 							invitationCode: res.data?.data?.invitationCode || '',
		// 							dhkey: dh.generateSecretKey(dhData.publicKey.external),
		// 						})
		// 						await socketApi.v1
		// 							.SecretChat(res.data?.data?.invitationCode || '')
		// 							.SendE2eeDHPublicKey(
		// 								RSA.encrypt(
		// 									e2ee.rsaPublicKey,
		// 									JSON.stringify({
		// 										prime: dh.prime,
		// 										base: dh.base,
		// 										publicKey: {
		// 											external: dh.publicKey.internal,
		// 										},
		// 									})
		// 								),
		// 								data.uid
		// 							)
		// 						break
		// 					case 'SendE2eeRSAPublicKey':
		// 						// 拿到房主RSAKey后，再将自己的发给对方
		// 						console.log(
		// 							'SendE2eeRSAPublicKey',
		// 							RSA.verifySign(
		// 								data.rsaPublicKey,
		// 								data.rsaPublicKey,
		// 								data.rsaSign
		// 							)
		// 						)
		// 						if (
		// 							RSA.verifySign(
		// 								data.rsaPublicKey,
		// 								data.rsaPublicKey,
		// 								data.rsaSign
		// 							)
		// 						) {
		// 							console.log('SendE2eeRSAPublicKey true', res.data?.data, data)

		// 							const { privateKey, publicKey, sign } =
		// 								await store.state.storage.rsaKey.getAndSet(
		// 									'rsakey',
		// 									async (v) => {
		// 										if (!v?.privateKey) {
		// 											const rk = await RSA.getRsaKey()
		// 											return {
		// 												privateKey: rk.privateKey,
		// 												publicKey: rk.publicKey,
		// 												sign: RSA.getSign(rk.privateKey, rk.publicKey),
		// 											}
		// 										}
		// 										return v
		// 									}
		// 								)
		// 							if (!privateKey || !publicKey || !sign) {
		// 								console.log('E2EE加密失败', res.data?.data?.invitationCode)
		// 								return
		// 							}

		// 							// store.commit('chat/updateChatDialogE2EE', {
		// 							// 	invitationCode: res.data?.data?.invitationCode || '',
		// 							// 	rsaPublicKey: data.aesPublicKey,
		// 							// })
		// 							await store.state.storage.e2ee.set(
		// 								res.data?.data?.invitationCode || '',
		// 								{
		// 									rsaPublicKey: data.rsaPublicKey,
		// 									invitationCode: res.data?.data?.invitationCode || '',
		// 									aesKey: '',
		// 								}
		// 							)
		// 							// const info = await store.state.storage.anonymousRoom.get(
		// 							// 	res.data?.data?.invitationCode || ''
		// 							// )
		// 							console.log(data)
		// 							if (data.uid === state.user.currentLogin.anonymousUid) {
		// 								console.log('房主这里')
		// 								store.dispatch('secretChat/sendE2eeDHKey', {
		// 									invitationCode: res.data?.data?.invitationCode || '',
		// 									uid: data.uid,
		// 								})
		// 								// 生成DH算法
		// 								return
		// 							}
		// 							// E2EE加密 将非房主的RSAKEY发给房主
		// 							console.log(
		// 								await socketApi.v1
		// 									.SecretChat(res.data?.data?.invitationCode || '')
		// 									.SendE2eeRSAPublicKey(publicKey, sign, data.uid)
		// 							)
		// 							// store.dispatch('secretChat/sendE2eeDHKey', {
		// 							// 	invitationCode: res.data?.data?.invitationCode || '',
		// 							// 	aesSign: data.aesSign,
		// 							// 	aesPublicKey: data.aesPublicKey,
		// 							// })
		// 						}
		// 						break
		// 					case 'SendMessage':
		// 						console.log(
		// 							'payload.chatRecord.customData.deviceId',
		// 							e2eeDecryption(res.data?.data?.invitationCode || '', data),
		// 							{
		// 								invitationCode: res.data?.data?.invitationCode || '',
		// 								status: 1,
		// 							}
		// 						)
		// 						store.dispatch('chat/updateAndSendMessage', {
		// 							...e2eeDecryption(res.data?.data?.invitationCode || '', data),
		// 							invitationCode: res.data?.data?.invitationCode || '',
		// 							status: 1,
		// 						})
		// 						break

		// 					case 'ReadMessage':
		// 						data = e2eeDecryption(
		// 							res.data?.data?.invitationCode || '',
		// 							data
		// 						)
		// 						console.log(data)
		// 						data.ids.forEach((id: string) => {
		// 							store.commit('chat/readMessage', {
		// 								id: id,
		// 								invitationCode: res.data?.data?.invitationCode || '',
		// 								authorId: data.userId,
		// 								readUserIds: [data.userId],
		// 							})
		// 						})
		// 						break

		// 					case 'StartCalling':
		// 						data = e2eeDecryption(
		// 							res.data?.data?.invitationCode || '',
		// 							data
		// 						)

		// 						console.log('StartCalling Router', data)
		// 						store.commit('chat/startCall', {
		// 							participants: data.participants,
		// 							authorId: data.authorId,
		// 							groupId: data.groupId,
		// 							type: data.type,
		// 							roomId: data.roomId,
		// 							invitationCode: res.data?.data?.invitationCode || '',
		// 						})
		// 						break
		// 					case 'Hangup':
		// 						data = e2eeDecryption(
		// 							res.data?.data?.invitationCode || '',
		// 							data
		// 						)
		// 						console.log('Hangup Router', data)
		// 						break
		// 					case 'UpdateSecretChat':
		// 						data = e2eeDecryption(
		// 							res.data?.data?.invitationCode || '',
		// 							data
		// 						)
		// 						console.log('UpdateSecretChat Router', data)
		// 						break
		// 					case 'CloseSecretChat':
		// 						data = e2eeDecryption(
		// 							res.data?.data?.invitationCode || '',
		// 							data
		// 						)
		// 						console.log('CloseSecretChat Router', data)
		// 						break

		// 					default:
		// 						break
		// 				}
		// 				// store.dispatch('friends/deleteFriend', res.data?.data?.friendId)
		// 				// store.state.friends.handlers.disagreeFriendHandlers.forEach(
		// 				// 	(func) => {
		// 				// 		func(res?.data?.data)
		// 				// 	}
		// 				// )
		// 				// store.state.friends.addFriendsHandlers.forEach((func) => {
		// 				//   func(res?.data?.data)
		// 				// })
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.updateSecretChat,
		// 		func: (response) => {
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.secretChat.UpdateInvitationCode.IResponse>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.secretChat.UpdateInvitationCode.Response
		// 				)
		// 			console.log('UpdateInvitationCode Router', res?.data?.data)
		// 			if (
		// 				res?.data?.code === 200 &&
		// 				res?.data?.data.invitationCodeInfo?.id
		// 			) {
		// 				store.dispatch(
		// 					'secretChat/updateSecretChat',
		// 					res?.data?.data.invitationCodeInfo
		// 				)
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.closeSecretChat,
		// 		func: (response) => {
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.secretChat.CloseInvitationCode.IResponse>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.secretChat.CloseInvitationCode.Response
		// 				)
		// 			console.log('CloseInvitationCode Router', res?.data?.data)
		// 			if (res?.data?.code === 200 && res?.data?.data.invitationCode) {
		// 				store.dispatch(
		// 					'secretChat/closeSecretChat',
		// 					res?.data?.data.invitationCode
		// 				)
		// 			}
		// 		},
		// 	})
		// 	.router({
		// 		eventName: state.api.socketRouter.v1.restartSecretChat,
		// 		func: (response) => {
		// 			const res =
		// 				SocketioCoding.ResponseDataDecode<protoRoot.secretChat.RestartSecretChat.IResponse>(
		// 					SocketioCoding.ResponseDecode(response),
		// 					protoRoot.secretChat.RestartSecretChat.Response
		// 				)
		// 			console.log('RestartSecretChat Router', res?.data?.data)
		// 			if (
		// 				res?.data?.code === 200 &&
		// 				res?.data?.data.invitationCodeInfo?.id
		// 			) {
		// 				store.dispatch(
		// 					'secretChat/joinAnonymousRoom',
		// 					res?.data?.data.invitationCodeInfo?.id
		// 				)
		// 			}
		// 		},
		// 	})
	},
}
export default createSocketioRouter
