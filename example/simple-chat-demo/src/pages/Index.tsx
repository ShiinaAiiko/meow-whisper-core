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

	useEffect(() => {
		console.log('getRecentChatDialogueList', messages.recentChatDialogueList)
		if (
			messages.recentChatDialogueList.length > 0 &&
			messages.activeRoomIndex < 0
		) {
			setActiveRoomIndex(0)
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
						{messages.getMessageStatus !== 'GetSuccess' ? (
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
								return (
									<saki-chat-dialog
										key={i}
										ref={bindEvent({
											tap: () => {
												setActiveRoomIndex(i)
											},
										})}
										selected={i === messages.activeRoomIndex}
										avatar-text={!info.avatar ? info.name : ''}
										nickname={info.name}
										avatar={info.avatar}
										count={v.unreadMessageCount}
										last-message-time={
											mwc.sdk?.methods.getLastMessageTime(
												Number(v.lastMessageTime)
											) || ""
										}
										last-message={
											v.typingMessage
												? 'Draft: ' + v.typingMessage
												: mwc.sdk?.methods.getLastMessage(v.lastMessage)
										}
									></saki-chat-dialog>
								)
							})}
					</div>
					<div slot='sidebar-footer'>SidebarFooter</div>
					{messages.activeRoomIndex === -1 ? (
						<div slot='message-container'>什么都没有</div>
					) : (
						<div
							style={{
								width: '100%',
								height: '100%',
							}}
							slot='message-container'
						>
							{messages.recentChatDialogueList.map((v, i) => {
								return (
									<MessageContainerComponent
										key={i}
										visible={
											!!(
												v.showMessageContainer && messages.activeRoomIndex === i
											)
										}
										index={i}
										roomId={v.roomId || ''}
										id={v.id || ''}
										type={v.type as any}
									></MessageContainerComponent>
								)
							})}
						</div>
					)}
				</saki-chat-container>
			</div>
		</>
	)
}

export default ChatPage
