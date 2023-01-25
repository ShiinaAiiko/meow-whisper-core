import React, { useEffect, useRef, useState } from 'react'
import { bindEvent } from '../modules/bindEvent'

import { useSelector, useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import store, {
	RootState,
	AppDispatch,
	useAppDispatch,
	methods,
	configSlice,
	userSlice,
	messagesSlice,
} from '../store'
import './NewGroup.scss'
import { useTranslation } from 'react-i18next'
import { prompt, alert, snackbar } from '@saki-ui/core'
import { eventTarget } from '../store/config'
import { SyncOff } from './Icon'
import { Debounce, validation } from '@nyanyajs/utils'
import { protoRoot } from '../protos'
import { FriendItem } from '../store/contacts'
import SelectMembersComponent from './SelectMembers'
import { getDialogueInfo } from '../modules/methods'

const MessageContainerComponent = ({
	index,
	id,
	type,
	visible,
	roomId,
}: {
	id: string
	type: 'Group' | 'Contact'
	index: number
	visible: boolean
	roomId: string
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
		(state: RootState) => state.messages.messagesMap[roomId]?.list
	)
	const group = useSelector((state: RootState) => state.group)

	const nsocketio = useSelector((state: RootState) => state.nsocketio)
	const appStatus = useSelector((state: RootState) => state.config.status)
	const user = useSelector((state: RootState) => state.user)

	const dispatch = useDispatch<AppDispatch>()

	const [sending, setSeding] = useState(false)
	const [avatar, setAvatar] = useState('')
	const [nickname, setNickname] = useState('')
	const [bio, setBio] = useState('')
	const [isSelectMembers, setIsSelectMembers] = useState(false)
	const [createButtonLoading, setCreateButtonLoading] = useState(false)
	const [selectMembers, setSelectMember] = useState<FriendItem[]>([])

	const location = useLocation()
	const history = useNavigate()
	const messageMainScrollEl = useRef<any>()

	const [inputbarToolDorpdown, setInputbarToolDorpdown] = useState(false)
	const [messageHeaderMoreDorpdown, setMessageHeaderMoreDorpdown] =
		useState(false)
	const [messageRichText, setMessageRichText] = useState('')
	const [message, setMessage] = useState('')

	const [getMessageDebounce] = useState(new Debounce())

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

	const call = (type: 'Audio' | 'Video') => {
		console.log(type)
	}
	const sendFile = (type: 'Image' | 'Video' | 'File') => {
		console.log(type)
	}

	const clear = () => {
		setMessage('')
		setMessageRichText('')
		setSeding(false)

		dispatch(
			messagesSlice.actions.setDraft({
				index,
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

	useEffect(() => {
		console.log(
			'visible',
			messages.messagesMap[roomId]?.status,
			visible,
			roomId,
			message,
			messageRichText
		)
		if (!visible) {
			console.log('message', message)
			message &&
				!sending &&
				dispatch(
					messagesSlice.actions.setDraft({
						index,
						message: message || '',
					})
				)
		} else {
			console.log('initMessageMap', roomId, messages.messagesMap[roomId])
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
		<saki-chat-message-container visible={visible} full>
			<div className='message-header' slot='message-header'>
				visible: {visible},{type},{index},{id},{roomId}
				<saki-chat-message-header
					ref={bindEvent({
						clickinfo: () => {
							openInfo()
						},
					})}
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
									<div className='message-inputbar-button-file' slot='main'>
										<saki-menu
											ref={bindEvent({
												selectvalue: (e) => {
													switch (e.detail.value) {
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
											<saki-menu-item padding='10px 18px' value='Info'>
												<div className='message-b-f-item'>
													<saki-icon
														type='Detail'
														width='20px'
														height='20px'
														margin='0 8px 0 0'
														color='#777'
													/>
													<span>
														{messages.activeRoomInfo?.type === 'Group'
															? 'Video group info'
															: 'View profile'}
													</span>
												</div>
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
						proportional-scroll='true'
						keep-distance-to-bottom
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
								const u = mwc.cache?.userInfo.get(v.authorId || '')?.userInfo
								const pMessage = i > 0 ? messagesList[i - 1] : undefined
								return (
									<saki-chat-bubble
										previous-message-uid={pMessage?.authorId}
										previous-message-send-time={pMessage?.createTime}
										previous-message-type={
											pMessage?.authorId === user.userInfo.uid
												? 'sender'
												: 'receiver'
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
											v.authorId === user.userInfo.uid ? 'sender' : 'receiver'
										}
										read-progress={
											mwc.sdk?.methods.getType(v.roomId || '') === 'Contact'
												? (v?.readUserIds?.length || 0) / 1
												: (v?.readUserIds?.length || 0) /
												  ((messages.activeRoomInfo?.members || 1) - 1)
										}
										uid={v.authorId}
										horizontal-margin='46px'
										vertical-margin='10px'
										key={i}
									>
										<div
											style={{
												padding: '2px 4px',
											}}
											dangerouslySetInnerHTML={{
												__html: v.message || '',
											}}
										></div>
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
			<div className='message-input-bar' slot='message-inputbar'>
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
				<div className='message-buttons'>
					<saki-button
						ref={bindEvent({
							tap: () => {
								let m = messageRichText
								// clear()
								setSeding(true)
								dispatch(
									methods.messages.sendMessage({
										roomId: messages.activeRoomInfo?.roomId || '',
										id,
										message: m,
										type,
										onMessageSentSuccessfully,
									})
								)
							},
						})}
						margin='0 0 0 10px'
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
											case 'Video':
												sendFile('Video')
												break
											case 'File':
												sendFile('File')
												break

											default:
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
		</saki-chat-message-container>
	)
}

export default MessageContainerComponent
