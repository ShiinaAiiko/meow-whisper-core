import React, { useEffect, useRef, useState } from 'react'
import { bindEvent } from '../modules/bindEvent'

import { useSelector, useDispatch } from 'react-redux'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import store, {
	RootState,
	AppDispatch,
	useAppDispatch,
	methods,
	configSlice,
	userSlice,
	messagesSlice,
} from '../store'
import './MessageContainer.scss'
import { useTranslation } from 'react-i18next'
import { prompt, alert, snackbar, multiplePrompts } from '@saki-ui/core'
import { eventTarget } from '../store/config'
import { SyncOff } from './Icon'
import axios from 'axios'
import { Debounce, validation } from '@nyanyajs/utils'
import { protoRoot } from '../protos'
import { FriendItem } from '../store/contacts'
import SelectMembersComponent from './SelectMembers'
import { getDialogueInfo } from '../modules/methods'
import md5 from 'blueimp-md5'
import { MessageItem } from '../store/messages'

const MessageContainerComponent = ({
	index,
	id,
	type,
	visible,
	roomId,
	isAuthor,
}: {
	id: string
	type: 'Group' | 'Contact'
	index: number
	visible: boolean
	roomId: string
	isAuthor: boolean
}) => {
	const { t, i18n } = useTranslation('index-header')
	const mwc = useSelector((state: RootState) => state.mwc)
	const config = useSelector((state: RootState) => state.config)
	const contacts = useSelector((state: RootState) => state.contacts)
	const messages = useSelector((state: RootState) => state.messages)

	const mapValue = useSelector(
		(state: RootState) => state.messages.messagesMap[roomId]
	)
	// const dialog = useSelector(
	// 	(state: RootState) =>
	// 		state.messages.recentChatDialogueList.filter((v) => {
	// 			return v.roomId === roomId
	// 		})?.[0]
	// )
	const messagesList = useSelector(
		(state: RootState) => state.messages.messagesMap[roomId]?.list || []
	)
	const group = useSelector((state: RootState) => state.group)

	const nsocketio = useSelector((state: RootState) => state.nsocketio)
	const appStatus = useSelector((state: RootState) => state.config.status)
	const user = useSelector((state: RootState) => state.user)

	const dispatch = useDispatch<AppDispatch>()

	const bubbleContextMenuEl = useRef<any>()
	const [bubbleContextMenuIndex, setBubbleContextMenuIndex] = useState(-1)

	const [mounted, setMounted] = useState(false)

	const [sending, setSeding] = useState(false)

	const [callGetMembers, setCallGetMembers] = useState(false)
	const [callType, setCallType] = useState<'Audio' | 'Video' | 'ScreenShare'>(
		'Audio'
	)

	const [openEmojiDropdown, setOpenEmojiDropdown] = useState(false)
	const [enbalSelect, setEnbalSelect] = useState(false)
	const [selectDialog, setSelectDialog] = useState(false)
	const [selectMessageIds, setSelectMessageIds] = useState<string[]>([])

	const [goToMessageId, setGoToMessageId] = useState<string>('')

	const [selectReplyMessage, setSelectReplyMessage] = useState<MessageItem>()

	const [editMessage, setEditMessage] = useState<MessageItem>()

	const [avatar, setAvatar] = useState('')
	const [nickname, setNickname] = useState('')
	const [bio, setBio] = useState('')
	const [isSelectMembers, setIsSelectMembers] = useState(false)
	const [createButtonLoading, setCreateButtonLoading] = useState(false)
	const [selectMembers, setSelectMember] = useState<FriendItem[]>([])

	const messageMainScrollEl = useRef<any>()

	const [inputbarToolDorpdown, setInputbarToolDorpdown] = useState(false)
	const [messageHeaderMoreDorpdown, setMessageHeaderMoreDorpdown] =
		useState(false)
	const [messageRichText, setMessageRichText] = useState('')
	const [message, setMessage] = useState('')

	const [getMessageDebounce] = useState(new Debounce())

	const navigate = useNavigate()
	const [searchParams] = useSearchParams()

	const openInfo = () => {
		if (messages.activeRoomInfo?.type === 'Group') {
			dispatch(
				configSlice.actions.setModalGroupId(messages.activeRoomInfo?.id || '')
			)
		} else {
			dispatch(
				configSlice.actions.setModalUserId(messages.activeRoomInfo?.id || '')
			)
		}
	}

	const call = async (
		t: 'Audio' | 'Video' | 'ScreenShare',
		isSelectMembers: boolean = false,
		members: string[] = []
	) => {
		setCallType(t)
		let participants: protoRoot.message.IMessagesCallParticipants[] = []
		switch (type) {
			case 'Contact':
				participants.push({
					uid: user.userInfo.uid,
					caller: true,
				})
				participants.push({
					uid: id,
					caller: false,
				})
				break
			case 'Group':
				if (!isSelectMembers) {
					dispatch(
						methods.group.getGroupMembers({
							groupId: roomId,
						})
					)
					setCallGetMembers(true)
					return
				}
				participants = members.map((v) => {
					return {
						uid: v,
						caller: v === user.userInfo.uid,
					}
				})
				console.log(t, members, {
					roomId: roomId,
					type: t,
					participants: participants,
				})
				break

			default:
				break
		}
		await mwc.sdk?.api.message.startCalling({
			roomId: roomId,
			type: t,
			participants: participants,
		})
	}
	const sendFile = (type: 'Image' | 'Video' | 'File') => {
		console.log(type)
		// getUploadFileToken
		dispatch(methods.messages.sendFileMessage({ roomId, type }))
	}

	const clear = () => {
		setMessage('')
		setMessageRichText('')
		setSeding(false)

		dispatch(
			messagesSlice.actions.setDraft({
				roomId,
				message: '',
			})
		)
	}

	const onMessageSentSuccessfully = () => {
		console.log('onMessageSentSuccessfully')
		clear()
	}

	const getMessages = () => {
		if (mapValue?.status === 'noMore') return
		getMessageDebounce.increase(async () => {
			await dispatch(
				methods.messages.getMessages({
					roomId,
				})
			)
		}, 300)
	}

	const download = async (src: string, fileSuffix: string) => {
		const res = await axios.get(src, {
			responseType: 'blob',
		})
		var a = document.createElement('a')
		var filename = src.substring(src.lastIndexOf('/') + 1) + '.' + fileSuffix
		console.log('download', filename, src, fileSuffix)
		a.href = window.URL.createObjectURL(res.data)
		a.download = filename
		a.target = '_blank'
		URL.revokeObjectURL(src)
		a.click()
	}

	const selectMessage = (v: MessageItem) => {
		if (selectMessageIds.includes(v.id || '')) {
			setSelectMessageIds(selectMessageIds.filter((sv) => sv !== v.id))
			return
		}
		setSelectMessageIds(selectMessageIds.concat([v.id || '']))
	}

	const goToMessage = async (id: string) => {
		const { messages } = store.getState()
		const messagesMap = messages.messagesMap[roomId]
		console.log(id)
		console.log(
			messagesMap.list.filter((sv) => {
				return sv.id === id
			})?.length
		)

		if (
			!messagesMap.list.filter((sv) => {
				return sv.id === id
			})?.length
		) {
			if (messagesMap.status === 'noMore') {
				console.log('找不到这条消息')
				return
			}
			await dispatch(
				methods.messages.getMessages({
					roomId,
				})
			)
			await goToMessage(id)
			return
		}
		console.log('有了')
		setGoToMessageId(id)
		// 等待渲染完毕
		setTimeout(() => {
			const el: HTMLDivElement = document.body.querySelector(
				'saki-chat-bubble[data-id="' + id + '"]'
			) as any
			console.log(el)
			console.log(el?.offsetTop)
			messageMainScrollEl.current?.scrollTo(el?.offsetTop)
		}, 100)
	}

	useEffect(() => {
		console.log(
			'visible',
			visible,
			roomId,
			messages.activeRoomInfo,
			roomId === messages.activeRoomInfo?.roomId
		)
		if (visible) {
			console.log('开始渲染', mounted)

			!mounted && setMounted(true)

			// console.log('initMessageMap', roomId, messages.messagesMap[roomId])
			if (!messages.messagesMap[roomId]) {
				dispatch(
					messagesSlice.actions.initMessageMap({
						roomId,
						type,
					})
				)
			}
			if (!messages.messagesMap[roomId]?.list?.length) {
				getMessages()
			} else {
				dispatch(
					methods.messages.readMessages({
						roomId,
					})
				)
			}
		} else {
			message &&
				!sending &&
				dispatch(
					messagesSlice.actions.setDraft({
						roomId,
						message: message,
					})
				)
		}
	}, [visible])

	useEffect(() => {
		const v = messages.activeRoomInfo
		const info = getDialogueInfo(messages.activeRoomInfo)
		setAvatar(info.avatar)
		setNickname(info.name)
		setBio(info.bio)
	}, [messages.activeRoomInfo])

	return (
		<>
			{mounted ? (
				<>
					<saki-chat-message-container visible={visible} full>
						<div className='message-header' slot='message-header'>
							{/* visible: {visible},{type},{index},{id},{roomId} */}
							<saki-chat-message-header
								ref={bindEvent({
									clickinfo: () => {
										openInfo()
									},
									back: () => {
										dispatch(methods.messages.setActiveRoomIndex(-1))

										navigate?.('/', {
											replace: true,
										})
									},
								})}
								back-icon={config.deviceType === 'Mobile'}
								avatar-text={!avatar ? nickname : ''}
								avatar={avatar}
								nickname={nickname}
								desc={
									messages.activeRoomInfo?.type === 'Group'
										? messages.activeRoomInfo?.members + ' members'
										: messages.activeRoomInfo?.type === 'Contact'
										? bio ||
										  (Number(messages.activeRoomInfo?.lastSeenTime) >= 0
												? mwc.sdk?.methods.getLastSeenTime(
														Number(messages.activeRoomInfo?.lastSeenTime)
												  ) || ''
												: '')
										: ''
								}
							>
								<div slot='header-right'>
									<saki-row>
										<saki-col>
											<saki-button
												ref={bindEvent({
													tap: () => {
														// sendMessage()
														call('Audio')
													},
												})}
												width='40px'
												height='40px'
												type='CircleIconGrayHover'
											>
												<saki-icon
													type='Call'
													width='20px'
													height='20px'
													color='#777'
												/>
											</saki-button>
										</saki-col>
										<saki-col>
											<saki-button
												ref={bindEvent({
													tap: () => {
														// sendMessage()
														call('Video')
													},
												})}
												width='40px'
												height='40px'
												type='CircleIconGrayHover'
											>
												<saki-icon
													type='Video'
													width='20px'
													height='20px'
													color='#777'
												/>
											</saki-button>
										</saki-col>
										<saki-col>
											<saki-button
												ref={bindEvent({
													tap: () => {
														// sendMessage()
														call('ScreenShare')
													},
												})}
												width='40px'
												height='40px'
												type='CircleIconGrayHover'
											>
												<saki-icon
													type='ScreeShareFill'
													width='20px'
													height='20px'
													color='#777'
												/>
											</saki-button>
										</saki-col>
										<saki-col>
											<saki-dropdown
												ref={bindEvent({
													close: () => {
														setMessageHeaderMoreDorpdown(false)
													},
												})}
												visible={messageHeaderMoreDorpdown}
											>
												<saki-button
													ref={bindEvent({
														tap: () => {
															// sendMessage()
															setMessageHeaderMoreDorpdown(true)
														},
													})}
													width='40px'
													height='40px'
													type='CircleIconGrayHover'
												>
													<saki-icon
														type='More'
														width='20px'
														height='20px'
														color='#777'
													/>
												</saki-button>
												<div
													className='message-inputbar-button-file'
													slot='main'
												>
													<saki-menu
														ref={bindEvent({
															selectvalue: (e) => {
																switch (e.detail.value) {
																	case 'ClosePage':
																		dispatch(
																			methods.messages.setActiveRoomIndex(-1)
																		)
																		break
																	case 'Delete':
																		switch (type) {
																			case 'Contact':
																				dispatch(
																					methods.contacts.deleteContact({
																						uid: id,
																					})
																				)
																				break
																			case 'Group':
																				if (isAuthor) {
																					dispatch(
																						methods.group.disbandGroup({
																							groupId: id,
																						})
																					)
																				} else {
																					dispatch(
																						methods.group.leaveGroup({
																							groupId: id,
																						})
																					)
																				}
																				// dispatch(
																				// 	methods.contacts.deleteContact({
																				// 		uid: String(u.uid),
																				// 	})
																				// )
																				break

																			default:
																				break
																		}
																		break
																	case 'Info':
																		openInfo()
																		break

																	default:
																		break
																}
																setMessageHeaderMoreDorpdown(false)
															},
														})}
													>
														<saki-menu-item padding='8px 12px' value='ID'>
															<span
																style={{
																	fontSize: '12px',
																	color: '#999',
																}}
															>
																ID: {id}
															</span>
														</saki-menu-item>
														<saki-menu-item padding='8px 12px' value='Info'>
															<span
																style={{
																	fontSize: '13px',
																}}
															>
																{messages.activeRoomInfo?.type === 'Group'
																	? 'View group info'
																	: 'View profile'}
															</span>
														</saki-menu-item>
														<saki-menu-item padding='8px 12px' value='Delete'>
															<span
																style={{
																	fontSize: '13px',
																}}
															>
																{type === 'Contact'
																	? 'Delete contact'
																	: isAuthor
																	? 'Disband group'
																	: 'Leave group'}
															</span>
														</saki-menu-item>
														<saki-menu-item
															padding='8px 12px'
															value='ClosePage'
														>
															<span
																style={{
																	fontSize: '13px',
																}}
															>
																Close this page
															</span>
														</saki-menu-item>
													</saki-menu>
												</div>
											</saki-dropdown>
										</saki-col>
									</saki-row>
								</div>
							</saki-chat-message-header>
							{/* <MessagesHeader /> */}
						</div>

						<saki-chat-select visible={enbalSelect} slot='message-select'>
							<saki-col slot='left'>
								<saki-button
									ref={bindEvent({
										tap: () => {
											// setEnbalSelect(false)
											setSelectDialog(true)
										},
									})}
									padding='6px 18px'
									margin='0 10px 0 0'
									type='Primary'
								>
									Forward ({selectMessageIds.length})
								</saki-button>
								<saki-button
									ref={bindEvent({
										tap: () => {
											// setEnbalSelect(false)
											dispatch(
												messagesSlice.actions.setDeleteMessage({
													roomId,
													list: selectMessageIds,
												})
											)
										},
									})}
									padding='6px 18px'
									type='Primary'
								>
									Delete ({selectMessageIds.length})
								</saki-button>
							</saki-col>
							<div slot='right'>
								<saki-button
									ref={bindEvent({
										tap: () => {
											setEnbalSelect(false)
											setSelectMessageIds([])
										},
									})}
									padding='6px 18px'
									border='1px solid var(--saki-default-color)'
									color='var(--saki-default-color)'
								>
									Cancel
								</saki-button>
							</div>
						</saki-chat-select>
						<div
							style={{
								width: '100%',
								height: '100%',
							}}
							className='cp-main'
							slot='message-main'
						>
							{mapValue ? (
								<saki-scroll-view
									ref={messageMainScrollEl}
									mode='Inherit'
									position='Bottom'
									keep-scroll-position
									scroll-bar='Auto'
									// @distancetoborder="currentChat.distanceToborder"
									// @watchscrollto="currentChat.watchScrollTo"
									// @scrolltotop="currentChat.scrollToTop"
									// @mounted="currentChat.getScrollHeight"
								>
									<div>
										<saki-scroll-loading
											ref={bindEvent({
												tap: () => {
													getMessages()
												},
											})}
											type={mapValue?.status}
										></saki-scroll-loading>
										{messagesList.map((v, i) => {
											const u = mwc.cache?.userInfo.get(
												v.authorId || ''
											)?.userInfo
											const pMessage = i > 0 ? messagesList[i - 1] : undefined

											let type = ''
											let maxWidth = 120
											let name = ''
											let size = 0
											let suffix = ''
											let time = ''
											let expirationTime = 0
											let progress = 0.1
											let src = ''
											let width = 0
											let height = 0
											if (v?.image?.url) {
												type = 'Image'
												maxWidth = 300
												src = v.image.url
												width = Number(v.image.width)
												height = Number(v.image.height)
											}
											// console.log(v.replyMessage)
											return (
												<saki-chat-bubble
													data-id={v.id}
													key={v.id || md5(String(Number(v.createTime)))}
													ref={bindEvent({
														sendfailed: () => {
															console.log('消息发送失败', v.id, v.message)

															dispatch(
																messagesSlice.actions.setMessageItem({
																	roomId,
																	messageId: v.id || '',
																	value: {
																		...v,
																		status: -1,
																	},
																})
															)
														},
														resend: () => {
															console.log('resend', v.id, v.message)

															if (v.editing) {
																selectReplyMessage &&
																	setSelectReplyMessage(undefined)
																setEditMessage(v)
																setMessageRichText(v.message || '')
																return
															}
															dispatch(
																methods.messages.resendMessageToServer({
																	messageId: v.id || '',
																	roomId: roomId,
																	storeOnlyLocally: true,
																	message: {
																		...v,
																	},
																})
															)
															// resendMessageToServer
															// dispatch(methods.tools.developing())
														},
														tap: () => {
															if (enbalSelect) {
																selectMessage(v)
																return
															}
															if (v.call?.type) {
																call(v.call?.type as any)
															}
														},
														opencontextmenu: (e: any) => {
															if (enbalSelect) {
																selectMessage(v)
																return
															}
															bubbleContextMenuEl.current?.show({
																x: e.detail.x,
																y: e.detail.y,
															})
															setBubbleContextMenuIndex(i)
														},
													})}
													onClick={(e: any) => {
														e.target.localName !== 'saki-chat-bubble-reply' &&
															goToMessageId &&
															setGoToMessageId('')
													}}
													background-color={
														goToMessageId === v.id ? '#eee' : ''
													}
													bubble-background-color={
														v?.authorId === user.userInfo.uid
															? '#f6bfcc'
															: '#eee'
													}
													edit-text={Number(v.editTime) > 0 ? 'edited' : ''}
													selected={selectMessageIds.includes(v.id || '')}
													previous-message-uid={pMessage?.authorId}
													previous-message-send-time={pMessage?.createTime}
													previous-message-type={
														pMessage?.authorId === user.userInfo.uid
															? 'sender'
															: 'receiver'
													}
													padding={type === 'Image' ? '0px' : ''}
													border-radius={
														v?.authorId === user.userInfo.uid
															? '20px 1px 20px 20px'
															: '1px 20px 20px 20px'
													}
													border={
														bubbleContextMenuIndex === i
															? type === 'Image'
																? 'none'
																: '2px solid var(--saki-default-color)'
															: type === 'Image'
															? 'none'
															: '2px solid rgba(0,0,0,0)'
													}
													send-time={v.createTime}
													status={v.status}
													read-stats-icon
													status-icon
													display-time
													user-info-display-mode='Full'
													avatar={u?.avatar}
													nickname={u?.nickname}
													type={
														v.authorId === user.userInfo.uid
															? 'sender'
															: 'receiver'
													}
													call-type={v.call?.type || ''}
													call-time={v.call?.time || ''}
													call-status={v.call?.status || ''}
													read-progress={
														mwc.sdk?.methods.getType(v.roomId || '') ===
														'Contact'
															? (v?.readUsers?.length || 0) / 1
															: (v?.readUsers?.length || 0) /
															  ((messages.activeRoomInfo?.members || 1) - 1)
													}
													uid={v.authorId}
													horizontal-margin='46px'
													vertical-margin='10px'
													watch-status
													watch-status-timeout='5'
													watch-status-count='1'
												>
													<>
														{v?.replyMessage?.id
															? (() => {
																	const u = mwc.cache?.userInfo.get(
																		v?.replyMessage?.authorId || ''
																	)?.userInfo
																	let message =
																		v?.replyMessage?.message?.replace(
																			/<[^>]+>/gi,
																			''
																		) || ''
																	if (v?.replyMessage?.image?.url) {
																		message = '[Photo]'
																	}

																	return (
																		<saki-chat-bubble-reply
																			ref={bindEvent({
																				goto: () => {
																					goToMessage(v?.replyMessage?.id || '')
																				},
																			})}
																			nickname={u?.nickname}
																			message={message}
																			image-src={
																				v?.replyMessage?.image?.url || ''
																			}
																		></saki-chat-bubble-reply>
																	)
															  })()
															: ''}
														{type ? (
															<saki-chat-bubble-file
																ref={bindEvent({
																	download: () => {
																		console.log('download')
																	},
																	load: () => {
																		// messageMainScrollEl.current?.keepScrollPosition()
																	},
																})}
																file-width={width}
																file-height={height}
																width='100%'
																max-width={maxWidth}
																type={type}
																name={name}
																size={size}
																suffix={suffix}
																time={time}
																expiration-time={expirationTime}
																progress={progress}
																src={src}
															></saki-chat-bubble-file>
														) : (
															<>
																<div
																	style={{
																		padding: '2px 4px',
																	}}
																	dangerouslySetInnerHTML={{
																		__html: v.message || '',
																	}}
																></div>
															</>
														)}
													</>
												</saki-chat-bubble>
											)
										})}
										<div
											style={{
												width: '100%',
												padding: '10px',
											}}
										></div>
									</div>
								</saki-scroll-view>
							) : (
								''
							)}
						</div>
						<saki-row flex-direction='column' slot='message-inputbar'>
							<saki-col>
								{selectReplyMessage?.id
									? (() => {
											const u = mwc.cache?.userInfo.get(
												selectReplyMessage?.authorId || ''
											)?.userInfo
											return (
												<saki-chat-reply
													ref={bindEvent({
														close: (e) => {
															setSelectReplyMessage(undefined)
														},
													})}
													nickname={u?.nickname}
													message={
														selectReplyMessage?.message?.replace(
															/<[^>]+>/gi,
															''
														) || ''
													}
													image-src={selectReplyMessage?.image?.url || ''}
												></saki-chat-reply>
											)
									  })()
									: ''}
							</saki-col>
							<saki-col>
								{editMessage?.id
									? (() => {
											const u = mwc.cache?.userInfo.get(
												editMessage?.authorId || ''
											)?.userInfo
											return (
												<saki-chat-edit
													ref={bindEvent({
														close: (e) => {
															setEditMessage(undefined)
															setMessageRichText('')
														},
													})}
													title={'Edit message'}
													message={
														editMessage?.message?.replace(/<[^>]+>/gi, '') || ''
													}
												></saki-chat-edit>
											)
									  })()
									: ''}
							</saki-col>
							<saki-col>
								<div className='message-input-bar'>
									<div className='message-left-buttons'>
										<saki-dropdown
											ref={bindEvent({
												close: () => {
													setOpenEmojiDropdown(false)
												},
											})}
											floating-direction='Left'
											visible={openEmojiDropdown}
										>
											<saki-button
												ref={bindEvent({
													tap: () => {
														setOpenEmojiDropdown(true)
													},
												})}
												margin='0 4px 0 0 '
												width='40px'
												height='40px'
												type='CircleIconGrayHover'
											>
												<saki-icon
													type='Emoji'
													width='20px'
													height='20px'
													color='#777'
												/>
											</saki-button>
											<div className='message-inputbar-emoji' slot='main'>
												<saki-tabs type='Flex' full>
													<saki-tabs-item
														font-size='14px'
														label='Emoji'
														name={'Emoji'}
													>
														<saki-scroll-view mode='Inherit'>
															<div className='mie-info-page'>
																<saki-card hide-title hide-subtitle>
																	<div
																		style={{
																			textAlign: 'center',
																			margin: '30px 0',
																		}}
																	>
																		预留, 暂未开放
																	</div>
																</saki-card>
															</div>
														</saki-scroll-view>
													</saki-tabs-item>

													<saki-tabs-item
														font-size='14px'
														label='CustomStickers'
														name={'Custom Stickers'}
													>
														<saki-scroll-view mode='Inherit'>
															<div className='mie-cs-page'>
																<saki-card hide-title hide-subtitle>
																	<div
																		style={{
																			textAlign: 'center',
																			margin: '30px 0',
																		}}
																	>
																		预留, 暂未开放
																	</div>
																</saki-card>
															</div>
														</saki-scroll-view>
													</saki-tabs-item>
												</saki-tabs>
											</div>
										</saki-dropdown>
									</div>
									<div className='message-inputbar-input'>
										<saki-textarea
											ref={bindEvent({
												changevalue: (e) => {
													// console.log('textarea', e.detail)
													setMessageRichText(e.detail.richText)
													setMessage(e.detail.content)
												},
											})}
											max-height='300px'
											width='100%'
											padding='0'
											font-size='14px'
											border-radius='0'
											min-length='0'
											max-length='10000'
											background-color='rgb(243,243,243)'
											value={messageRichText}
											// :value="currentChat.value"
											// @clearvalue="currentChat.value = ''"
											// @pressenter="currentChat.send"
											// @changevalue="(e:CustomEvent)=>currentChat.changevalue(e)"
											placeholder='Type a message'
										/>
									</div>
									<div className='message-right-buttons'>
										<saki-button
											ref={bindEvent({
												tap: async () => {
													let m = messageRichText
													// clear()
													setSeding(true)
													if (editMessage?.id) {
														dispatch(
															methods.messages.editMessage({
																roomId: roomId,
																messageId: editMessage?.id || '',
																message: m,
																onMessageSentSuccessfully,
															})
														)
														setEditMessage(undefined)
														return
													}
													await dispatch(
														methods.messages.sendMessage({
															roomId: messages.activeRoomInfo?.roomId || '',
															message: m,
															replyId: selectReplyMessage?.id || '',
															replyMessage: selectReplyMessage,
															onMessageSentSuccessfully,
														})
													)
													setSelectReplyMessage(undefined)
												},
											})}
											margin='0 0 0 4px'
											width='40px'
											height='40px'
											type='CircleIconGrayHover'
										>
											<saki-icon
												type='Send'
												width='18px'
												height='18px'
												color='var(--default-color)'
											/>
										</saki-button>
										<saki-dropdown
											ref={bindEvent({
												close: () => {
													setInputbarToolDorpdown(false)
												},
											})}
											visible={inputbarToolDorpdown}
										>
											<saki-button
												ref={bindEvent({
													tap: () => {
														setInputbarToolDorpdown(true)
													},
												})}
												width='40px'
												height='40px'
												type='CircleIconGrayHover'
											>
												<saki-icon
													type='Paperclip'
													width='20px'
													height='20px'
													color='#777'
												/>
											</saki-button>
											<div className='message-inputbar-button-file' slot='main'>
												<saki-menu
													ref={bindEvent({
														selectvalue: (e) => {
															switch (e.detail.value) {
																case 'Image':
																	sendFile('Image')
																	break
																// case 'Video':
																// 	sendFile('Video')
																// 	break
																// case 'File':
																// 	sendFile('File')
																// 	break

																default:
																	dispatch(methods.tools.developing())
																	break
															}
															setInputbarToolDorpdown(false)
														},
													})}
												>
													<saki-menu-item padding='10px 18px' value='Image'>
														<div className='message-b-f-item'>
															<saki-icon
																type='Image'
																width='20px'
																height='20px'
																margin='0 8px 0 0'
																color='#777'
															/>
															<span>Photo</span>
														</div>
													</saki-menu-item>
													<saki-menu-item padding='10px 18px' value='Video'>
														<div className='message-b-f-item'>
															<saki-icon
																type='Video'
																width='20px'
																height='20px'
																margin='0 8px 0 0'
																color='#777'
															/>
															<span>Video</span>
														</div>
													</saki-menu-item>
													<saki-menu-item padding='10px 18px' value='File'>
														<div className='message-b-f-item'>
															<saki-icon
																type='File'
																width='20px'
																height='20px'
																margin='0 8px 0 0'
																color='#777'
															/>
															<span>File</span>
														</div>
													</saki-menu-item>
												</saki-menu>
											</div>
										</saki-dropdown>
									</div>
								</div>
							</saki-col>
						</saki-row>
					</saki-chat-message-container>

					{/* 添加群成员去语音 */}
					{type === 'Group' ? (
						<saki-modal
							visible={callGetMembers}
							width='100%'
							height='100%'
							max-width={config.deviceType === 'Mobile' ? '100%' : '420px'}
							max-height={config.deviceType === 'Mobile' ? '100%' : '520px'}
							mask
							border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
							border={config.deviceType === 'Mobile' ? 'none' : ''}
							mask-closable='false'
							background-color='#fff'
							ref={bindEvent({
								close: (e) => {
									setCallGetMembers(false)
								},
							})}
						>
							<div
								style={{
									width: '100%',
									height: '100%',
								}}
							>
								<SelectMembersComponent
									title='Select Members'
									members={
										mwc.cache?.group.get(roomId).membersList.map((v) => {
											return {
												uid: v.userInfo?.uid || '',
												avatar: v.userInfo?.avatar || '',
												nickname: v.userInfo?.nickname || '',
												bio:
													(v?.lastSeenTime || 0) > 0
														? mwc.sdk?.methods.getLastSeenTime(
																Number(v.lastSeenTime)
														  ) || ''
														: '',
												selected: v.userInfo?.uid === user.userInfo.uid,
												lastSeenTime: '',
											}
										}) || []
									}
									onCancel={(e) => {
										if (!createButtonLoading) {
											setCallGetMembers(false)
										}
									}}
									cancelButtonText='Back'
									createButtonText='Call'
									createButtonLoading={createButtonLoading}
									onSelectMembers={(uids) => {
										// create(uids)
										// console.log('select', uids)
										// callType
										if (uids.length <= 1) {
											snackbar({
												message: '请选择需要通话的成员',
												autoHideDuration: 2000,
												vertical: 'top',
												horizontal: 'center',
												backgroundColor: 'var(--saki-default-color)',
												color: '#fff',
											}).open()
											return
										}
										call(
											callType,
											true,
											uids.map((v) => {
												return v.uid
											})
										)
										setCallGetMembers(false)
									}}
								></SelectMembersComponent>
							</div>
						</saki-modal>
					) : (
						''
					)}

					{/* 选择某个成员转发 */}
					{enbalSelect ? (
						<saki-modal
							visible={selectDialog}
							width='100%'
							height='100%'
							max-width={config.deviceType === 'Mobile' ? '100%' : '420px'}
							max-height={config.deviceType === 'Mobile' ? '100%' : '520px'}
							mask
							border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
							border={config.deviceType === 'Mobile' ? 'none' : ''}
							mask-closable='false'
							background-color='#fff'
							ref={bindEvent({
								close: () => {},
							})}
						>
							<div
								style={{
									width: '100%',
									height: '100%',
								}}
							>
								<SelectMembersComponent
									title='Choose recipient'
									members={messages.recentChatDialogueList.map((v) => {
										if (v.type === 'Group') {
											const g = mwc.cache?.group.get(v.id)
											return {
												uid: v.id,
												avatar: g.avatar || '',
												nickname: g.name || '',
												bio: Number(g.members) + ' members',
												selected: false,
												lastSeenTime: '',
											}
										}
										const u = mwc.cache?.userInfo.get(v.id)
										return {
											uid: v.id,
											avatar: u.userInfo?.avatar || '',
											nickname: u.userInfo?.nickname || '',
											bio:
												(u?.lastSeenTime || 0) > 0
													? mwc.sdk?.methods.getLastSeenTime(
															Number(u.lastSeenTime)
													  ) || ''
													: '',
											selected: false,
											lastSeenTime: '',
										}
									})}
									onCancel={(e) => {
										setSelectDialog(false)
										// setSelectMessageIds([])
									}}
									cancelButtonText='Back'
									createButtonText='Forward'
									createButtonLoading={createButtonLoading}
									onSelectMembers={async (uids) => {
										// create(uids)
										console.log('select', uids)
										// callType
										if (uids.length <= 0) {
											snackbar({
												message: '请选择需要转发的联系人',
												autoHideDuration: 2000,
												vertical: 'top',
												horizontal: 'center',
												backgroundColor: 'var(--saki-default-color)',
												color: '#fff',
											}).open()
											return
										}

										await dispatch(
											methods.messages.forwardMessages({
												ids: uids.map((v) => v.uid),
												messageList: selectMessageIds.map((v) => {
													return messagesList.filter((sv) => sv.id === v)?.[0]
												}),
											})
										)
										setSelectDialog(false)
										setTimeout(() => {
											setEnbalSelect(false)
											setSelectMessageIds([])
										}, 300)
									}}
								></SelectMembersComponent>
							</div>
						</saki-modal>
					) : (
						''
					)}

					{/* message bubble context menu */}

					<saki-context-menu
						ref={bindEvent(
							{
								selectvalue: (e) => {
									let m = messagesList[bubbleContextMenuIndex]
									console.log('saki-context-menu', e, m)
									switch (e.detail.value) {
										case 'Download':
											if (m.image?.url) {
												download(m.image.url, 'jpg')
											}
											break
										case 'Copy':
											navigator.clipboard.writeText(
												m?.message?.replace(/<[^>]+>/gi, '') || ''
											)
											snackbar({
												message: '文本复制成功！',
												autoHideDuration: 2000,
												vertical: 'top',
												horizontal: 'center',
												backgroundColor: 'var(--saki-default-color)',
												color: '#fff',
											}).open()
											break
										case 'Forward':
											setEnbalSelect(true)
											setSelectMessageIds([m.id || ''])
											setTimeout(() => {
												setSelectDialog(true)
											}, 200)
											break
										case 'Reply':
											if (editMessage) {
												setEditMessage(undefined)
												setMessageRichText('')
											}
											setSelectReplyMessage(m)
											break
										case 'Select':
											setEnbalSelect(true)
											setSelectMessageIds([m.id || ''])
											break
										// case 'AddSticker':
										// 	break
										// case 'Pin':
										// 	break
										case 'Edit':
											// dispatch(
											// 	methods.messages.editMessage({
											// 		roomId: roomId,
											// 		messageId: m.id || '',
											// 	})
											// )
											console.log(m.message)
											selectReplyMessage && setSelectReplyMessage(undefined)
											setEditMessage(m)
											setMessageRichText(m.message || '')
											break
										case 'Delete':
											dispatch(
												messagesSlice.actions.setDeleteMessage({
													roomId,
													list: [m?.id || ''],
												})
											)
											break

										default:
											dispatch(methods.tools.developing())
											break
									}
								},
								close: () => {
									setBubbleContextMenuIndex(-1)

									// chatDialogList.dialogContextMenuIndex = -1
								},
							},
							(e) => {
								bubbleContextMenuEl.current = e
							}
						)}
					>
						{(() => {
							let fontSize = '13px'
							let padding = '10px 20px'
							let m = messagesList[bubbleContextMenuIndex]
							return (
								<div>
									<saki-context-menu-item
										font-size={fontSize}
										padding={padding}
										value='Download'
										hide={!m?.image?.url || m?.audio?.url || m?.video?.url}
									>
										Download
									</saki-context-menu-item>
									<saki-context-menu-item
										font-size={fontSize}
										padding={padding}
										value='Edit'
										hide={m?.authorId !== user.userInfo.uid}
									>
										Edit
									</saki-context-menu-item>
									<saki-context-menu-item
										font-size={fontSize}
										padding={padding}
										value='Copy'
									>
										Copy
									</saki-context-menu-item>
									<saki-context-menu-item
										font-size={fontSize}
										padding={padding}
										value='Forward'
									>
										Forward
									</saki-context-menu-item>
									<saki-context-menu-item
										font-size={fontSize}
										padding={padding}
										value='Reply'
									>
										Reply
									</saki-context-menu-item>
									<saki-context-menu-item
										font-size={fontSize}
										padding={padding}
										value='Select'
									>
										Select
									</saki-context-menu-item>
									{m?.image?.url ? (
										<saki-context-menu-item
											font-size={fontSize}
											padding={padding}
											value='AddSticker'
											disabled
										>
											Add Sticker
										</saki-context-menu-item>
									) : (
										''
									)}
									{/* 收藏夹 */}
									<saki-context-menu-item
										font-size={fontSize}
										padding={padding}
										value='Pin'
										disabled
									>
										Pin
									</saki-context-menu-item>
									<saki-context-menu-item
										font-size={fontSize}
										padding={padding}
										value='Delete'
									>
										Delete
									</saki-context-menu-item>
								</div>
							)
						})()}
					</saki-context-menu>
				</>
			) : (
				//   <div>
				//     {mounted?"true":"false"}
				// </div>
				''
			)}
		</>
	)
}

export default MessageContainerComponent
