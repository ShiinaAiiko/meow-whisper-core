import React, { useEffect, useRef, useState } from 'react'
import { RouterProps } from 'react-router-dom'
import logo from '../logo.svg'
import { Helmet } from 'react-helmet-async'
import './Index.scss'
import store, {
	RootState,
	AppDispatch,
	useAppDispatch,
	methods,
	configSlice,
	messagesSlice,
} from '../store'
import { useSelector, useDispatch } from 'react-redux'

import { prompt, alert, snackbar, bindEvent } from '@saki-ui/core'
import { useTranslation } from 'react-i18next'
import { deepCopy } from '@nyanyajs/utils'
import { TransitionGroup, CSSTransition } from 'react-transition-group'
import { eventTarget } from '../store/config'
import { contact } from '../protos/proto'
import MessageContainerComponent from '../components/MessageContainer'
import DeleteMessagesComponent from '../components/DeleteMessages'
import { getDialogueInfo } from '../modules/methods'

const ChatPage = ({ children }: RouterProps) => {
	const { t, i18n } = useTranslation('ChatPage')
	const dispatch = useDispatch<AppDispatch>()
	const config = useSelector((state: RootState) => state.config)
	const user = useSelector((state: RootState) => state.user)
	const mwc = useSelector((state: RootState) => state.mwc)
	const contacts = useSelector((state: RootState) => state.contacts)
	const messages = useSelector((state: RootState) => state.messages)
	const group = useSelector((state: RootState) => state.group)

	const dialogContextMenuEl = useRef<any>()
	const [dialogContextMenuIndex, setDialogContextMenuIndex] = useState(-1)

	useEffect(() => {
		console.log('getRecentChatDialogueList', messages.recentChatDialogueList)
		if (
			messages.recentChatDialogueList.length > 0 &&
			messages.activeRoomIndex < 0
		) {
			// setTimeout(() => {
			// 	setActiveRoomIndex(0)
			// }, 300)
		}
	}, [messages.recentChatDialogueList])

	const setActiveRoomIndex = (i: number) => {
		dispatch(methods.messages.setActiveRoomIndex(i))
		// messageMainScrollEl.current?.scrollTo?.('bottom')
		// 未来可以存储到草稿箱
		// setMessage('')
	}
	return (
		<>
			<Helmet>
				<title>
					{'Messages' +
						' - ' +
						t('appTitle', {
							ns: 'common',
						})}
				</title>
			</Helmet>
			<div className={'chat-page ' + config.deviceType}>
				<saki-chat-container
					// box-shadow='0 0 10px rgba(0,0,0,0.1)'
					device-type={config.deviceType}
					message-page={messages.activeRoomIndex >= 0}
					class='cp-container'
				>
					<div className='cp-sidebar-header' slot='sidebar-header'>
						<saki-title margin='10px' level='1' color='#000'>
							Messages
						</saki-title>
						<div className='cp-h-search'>
							<saki-input
								height='40px'
								padding='0 0px'
								font-size='16px'
								close-icon={false}
								type='Search'
								background-color='#f1f3f4'
								border-radius='10px'
								placeholder=''
							/>

							{/* </div>
								</div>
								<div
									className='cp-sidebar-main'
									slot='sidebar-main'
								>
									{/* MessagesDialogList */}
							{/* <MessagesDialogList /> */}
						</div>
					</div>
					<div slot='sidebar-main'>
						{messages.getMessageStatus !== 'GetSuccess' &&
						mwc.nsocketioStatus === 'connected' ? (
							<saki-row margin='4px 0' padding='4px 0' justify-content='center'>
								<saki-col>
									<saki-animation-loading
										type='rotateEaseInOut'
										width='20px'
										height='20px'
										border='3px'
										border-color='var(--default-color)'
									/>
								</saki-col>
								<saki-col>
									<span
										style={{
											color: '#555',
											margin: '0 0 4px 0',
										}}
									>
										正在获取聊天记录
									</span>
								</saki-col>
							</saki-row>
						) : (
							''
						)}
						{messages.recentChatDialogueList
							// .concat(messages.recentChatDialogueList)
							// .concat(messages.recentChatDialogueList)
							// .concat(messages.recentChatDialogueList)
							// .concat(messages.recentChatDialogueList)
							// .concat(messages.recentChatDialogueList)
							.map((v, i) => {
								const info = getDialogueInfo(v)
								return !messages.deleteDialogIds.includes(v.roomId) ? (
									<saki-chat-dialog
										key={i}
										ref={bindEvent({
											tap: () => {
												setActiveRoomIndex(i)
											},
											contextmenu: (e: any) => {
												e.preventDefault()
												const em = e as MouseEvent
												dialogContextMenuEl.current?.show({
													x: em.clientX,
													y: em.clientY,
												})
												setDialogContextMenuIndex(i)
											},
										})}
										context-menu-active={dialogContextMenuIndex === i}
										selected={i === messages.activeRoomIndex}
										avatar-text={!info.avatar ? info.name : ''}
										nickname={info.name}
										avatar={info.avatar}
										count={v.unreadMessageCount}
										last-message-time={
											mwc.sdk?.methods.getLastMessageTime(
												Number(v.lastMessageTime)
											) || ''
										}
										last-message={
											v.typingMessage
												? 'Draft: ' + v.typingMessage
												: mwc.sdk?.methods.getLastMessage(v.lastMessage)
										}
									></saki-chat-dialog>
								) : (
									''
								)
							})}
					</div>
					<div slot='sidebar-footer'>SidebarFooter</div>
					<div
						className='m-none-page'
						style={{
							display:
								config.deviceType === 'Mobile'
									? 'none'
									: messages.activeRoomIndex > -1
									? 'none'
									: 'flex',
						}}
						slot='message-container'
					>
						<img src='/logo-256x256.png' alt='' />
						<div className='mc-title'>
							{t('appTitle', {
								ns: 'common',
							})}
							, 享受自由的乐趣
						</div>
					</div>
					<div
						style={{
							width: '100%',
							height: '100%',
							display: messages.activeRoomIndex === -1 ? 'none' : 'block',
						}}
						slot='message-container'
					>
						{messages.recentChatDialogueList.map((v, i) => {
							return (
								<MessageContainerComponent
									key={i}
									visible={
										!!(
											v.showMessageContainer &&
											messages.activeRoomIndex === i &&
											!messages.deleteDialogIds.includes(v?.roomId)
										)
									}
									isAuthor={
										v.type === 'Group'
											? mwc.cache.group.get(v.id)?.authorId ===
											  user.userInfo.uid
											: false
									}
									index={i}
									roomId={v.roomId || ''}
									id={v.id || ''}
									type={v.type as any}
								></MessageContainerComponent>
							)
						})}
					</div>
				</saki-chat-container>
			</div>

			{/* Dialog */}
			<saki-context-menu
				ref={bindEvent(
					{
						selectvalue: (e) => {
							console.log(e)
							let dialog =
								messages.recentChatDialogueList[dialogContextMenuIndex]
							switch (e.detail.value) {
								case 'ViewInfo':
									if (dialog.type === 'Group') {
										dispatch(
											configSlice.actions.setModalGroupId(dialog.id || '')
										)
									} else {
										dispatch(
											configSlice.actions.setModalUserId(dialog.id || '')
										)
									}
									break
								case 'ClearHistory':
									dispatch(
										methods.messages.clearHistory({
											roomId: dialog.roomId,
										})
									)
									break
								case 'HideConversation':
									dispatch(
										methods.messages.hideDialog({
											roomId: dialog.roomId,
										})
									)
									break

								default:
									break
							}
						},
						close: () => {
							setDialogContextMenuIndex(-1)
							// chatDialogList.dialogContextMenuIndex = -1
						},
					},
					(e) => {
						dialogContextMenuEl.current = e
					}
				)}
			>
				<saki-context-menu-item value='ViewInfo'>
					<div
						style={{
							fontSize: '13px',
						}}
					>
						{messages.recentChatDialogueList[dialogContextMenuIndex]?.type ===
						'Group'
							? 'View group info'
							: 'View profile'}
					</div>
				</saki-context-menu-item>
				<saki-context-menu-item value='ClearHistory'>
					<div
						style={{
							fontSize: '13px',
						}}
					>
						Clear history
					</div>
				</saki-context-menu-item>
				<saki-context-menu-item value='HideConversation'>
					<div
						style={{
							color: '#fa2337',
							fontSize: '13px',
						}}
					>
						Hide conversation
					</div>
				</saki-context-menu-item>
			</saki-context-menu>

			{/* Delete modal */}
			<DeleteMessagesComponent></DeleteMessagesComponent>
		</>
	)
}

export default ChatPage
