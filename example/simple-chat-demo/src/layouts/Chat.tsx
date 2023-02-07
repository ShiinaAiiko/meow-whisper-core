import React, { useEffect, useState } from 'react'
import {
	RouterProps,
	useLocation,
	useNavigate,
	useParams,
	useSearchParams,
} from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import './Chat.scss'
import { Header, Settings, Login } from '../components'
import { useSelector, useStore, useDispatch } from 'react-redux'
import store, {
	RootState,
	userSlice,
	AppDispatch,
	methods,
	configSlice,
} from '../store'
import { useTranslation } from 'react-i18next'
// import { userAgent } from './userAgent'
import {
	userAgent,
	CipherSignature,
	Debounce,
	compareUnicodeOrder,
} from '@nyanyajs/utils'
import * as nyanyalog from 'nyanyajs-log'
import HeaderComponent from '../components/Header'
import GroupInfoComponent from '../components/GroupInfo'
import UserInfoComponent from '../components/UserInfo'
import UserLoginComponent from '../components/UserLogin'
import CallComponent from '../components/Call'
import SettingsComponent from '../components/Settings'

import { storage } from '../store/storage'
import { bindEvent } from '@saki-ui/core'
import md5 from 'blueimp-md5'
// import parserFunc from 'ua-parser-js'

const ChatLayout = ({ children }: RouterProps) => {
	const [debounce] = useState(new Debounce())
	const { t, i18n } = useTranslation()
	// console.log('Index Layout')

	const dispatch = useDispatch<AppDispatch>()

	const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

	const mwc = useSelector((state: RootState) => state.mwc)
	const messages = useSelector((state: RootState) => state.messages)
	const nsocketio = useSelector((state: RootState) => state.nsocketio)
	const config = useSelector((state: RootState) => state.config)
	const contacts = useSelector((state: RootState) => state.contacts)
	const group = useSelector((state: RootState) => state.group)
	const user = useSelector((state: RootState) => state.user)
	const sso = useSelector((state: RootState) => state.sso)

	const [expand, setExpand] = useState(false)
	const navigate = useNavigate()
	const location = useLocation()
	const [searchParams] = useSearchParams()

	useEffect(() => {
		debounce.increase(async () => {
			await dispatch(methods.tools.init()).unwrap()
			setExpand((await storage.global.get('expand')) || false)
			await dispatch(methods.config.Init()).unwrap()
			dispatch(methods.user.Init()).unwrap()
			dispatch(methods.mwc.Init()).unwrap()
			await dispatch(methods.sso.Init()).unwrap()
			await dispatch(methods.user.checkToken()).unwrap()
			// dispatch(methods.appearance.Init()).unwrap()
			console.log('location', location)
			// console.log('config.deviceType getDeviceType', config)
		}, 0)

		// setTimeout(() => {
		// 	setOpenSettingModal(true)
		// }, 1000)
		// store.dispatch(storageSlice.actions.init())
	}, [])

	useEffect(() => {
		const init = async () => {
			if (user.isInit && user.isLogin) {
				// console.log(mwc.sdk)
				await mwc.sdk?.encryption.init()
				// await dispatch(methods.encryption.Init())
				// dispatch(methods.nsocketio.Init()).unwrap()
				await mwc.sdk?.nsocketio.connect()

				await dispatch(methods.messages.init())
			} else {
				mwc.sdk?.nsocketio.disconnect()
				// dispatch(methods.nsocketio.Close()).unwrap()
			}
		}
		init()
	}, [user.isInit, user.isLogin])

	useEffect(() => {
		console.log('开始获取 getCoantacts', user.isLogin, mwc.encryptionStatus)
		if (user.isLogin && mwc.encryptionStatus === 'success') {
			dispatch(methods.messages.getRecentChatDialogueList())

			dispatch(methods.contacts.getContactList())
			dispatch(methods.group.getGroupList())
			dispatch(methods.messages.getRecentChatDialogueList())
		}
	}, [user.isLogin, mwc.encryptionStatus])

	useEffect(() => {
		if (
			mwc.nsocketioStatus === 'connected' &&
			contacts.isInit &&
			group.isInit
		) {
			dispatch(methods.messages.initRooms())
		}
	}, [contacts.isInit, group.isInit, mwc.nsocketioStatus])

	useEffect(() => {
		console.log('mwc.nsocketioStatus -> ', mwc.nsocketioStatus)
		if (user.token) {
			let b = mwc.nsocketioStatus !== 'connected'
			dispatch(
				configSlice.actions.setIsConnectionError({
					mobile: b ? b && config.deviceType === 'Mobile' : false,
					pc: b ? b && config.deviceType !== 'Mobile' : false,
				})
			)
		} else {
			// let b = !user.token
			dispatch(
				configSlice.actions.setIsConnectionError({
					mobile: false,
					pc: false,
				})
			)
		}
	}, [mwc.nsocketioStatus, user.token, config.deviceType])

	useEffect(() => {
		if (messages.recentChatDialogueList.length) {
			messages.recentChatDialogueList.forEach((v) => {})
			dispatch(
				configSlice.actions.setCount({
					type: 'messages',
					value: messages.recentChatDialogueList.reduce(
						(acc, v) => acc + Number(v.unreadMessageCount),
						0
					),
				})
			)
		}
	}, [messages.recentChatDialogueList])

	return (
		<>
			<Helmet>
				<title>
					{t('appTitle', {
						ns: 'common',
					})}
				</title>
			</Helmet>
			<div className='chat-layout'>
				<Login />
				<>
					<HeaderComponent></HeaderComponent>
					{config.isConnectionError.mobile ? (
						<div className='cl-connection-error'>
							<div className='circle-loading'></div>
							<span
								style={{
									color: '#555',
								}}
							>
								{t('connecting', {
									ns: 'common',
								})}
							</span>
						</div>
					) : (
						''
					)}
					<div
						style={{
							height: config.isConnectionError.mobile
								? 'calc(100% - 90px)'
								: 'calc(100% - 50px)',
						}}
						className={'cl-main '}
					>
						<saki-chat-layout
							bottom-navigator={
								location.pathname === '/' ||
								location.pathname === '/contacts' ||
								location.pathname === '/notifications'
									? !searchParams.get('roomId')
									: false
							}
							device-type={config.deviceType}
						>
							<div className='cl-side-navigator' slot='side-navigator'>
								<saki-chat-layout-side-navigator
									ref={bindEvent({
										expandStatus: async (e) => {
											setExpand(e.detail)
											await storage.global.set('expand', e.detail)
										},
										change: async (e) => {
											console.log(e)
											if (e.detail.href === '/settings') {
												dispatch(configSlice.actions.setSettingVisible(true))
												return
											}
											navigate?.(e.detail.href)
										},
									})}
									expand={expand}
								>
									<div slot='top'>
										<saki-chat-layout-side-navigator-menu-item
											margin='0 0 12px 0'
											active={location.pathname === '/chat'}
											icon-type={'Messages'}
											name={'MESSAGES'}
											count={config.count.messages}
											href='/chat'
										></saki-chat-layout-side-navigator-menu-item>
										<saki-chat-layout-side-navigator-menu-item
											margin='0 0 12px 0'
											active={location.pathname === '/contacts'}
											icon-type={'User'}
											name={'CONTACTS'}
											count={config.count.contacts}
											href='/contacts'
										></saki-chat-layout-side-navigator-menu-item>
										<saki-chat-layout-side-navigator-menu-item
											margin='0 0 12px 0'
											active={location.pathname === '/notifications'}
											icon-type={'Notifications'}
											name={'NOTIFICATIONS'}
											count={config.count.notifications}
											href='/notifications'
										></saki-chat-layout-side-navigator-menu-item>
									</div>
									<div slot='bottom'>
										<saki-chat-layout-side-navigator-menu-item
											margin='12px 0 0 0'
											active={false}
											icon-type={'Settings'}
											icon-size='20px'
											name={'SETTINGS'}
											href='/settings'
										></saki-chat-layout-side-navigator-menu-item>
									</div>
								</saki-chat-layout-side-navigator>
							</div>
							<div slot='bottom-navigator'>
								<saki-chat-layout-bottom-navigator
									ref={bindEvent({
										expandStatus: async (e) => {
											setExpand(e.detail)
											await storage.global.set('expand', e.detail)
										},
										change: async (e) => {
											navigate?.(e.detail.href)
										},
									})}
								>
									<saki-chat-layout-bottom-navigator-item
										active={location.pathname === '/chat'}
										icon-type={'Messages'}
										name={'MESSAGES'}
										count={config.count.messages}
										href='/chat'
									></saki-chat-layout-bottom-navigator-item>
									<saki-chat-layout-bottom-navigator-item
										active={location.pathname === '/contacts'}
										icon-type={'User'}
										name={'CONTACTS'}
										// count={20}
										count={config.count.contacts}
										href='/contacts'
									></saki-chat-layout-bottom-navigator-item>
									<saki-chat-layout-bottom-navigator-item
										active={location.pathname === '/notifications'}
										icon-type={'Notifications'}
										name={'NOTIFICATIONS'}
										count={config.count.notifications}
										href='/notifications'
									></saki-chat-layout-bottom-navigator-item>
								</saki-chat-layout-bottom-navigator>
							</div>
							<div className='cl-m-main'>
								{!user.isLogin ? (
									<div className='cl-m-m-login'>
										<saki-button
											ref={bindEvent({
												tap: () => {
													// dispatch(
													// 	configSlice.actions.setOpenLoginUserDropDownMenu(true)
													// )
													dispatch(
														configSlice.actions.setStatus({
															type: 'loginModalStatus',
															v: true,
														})
													)
												},
											})}
											padding='8px 18px'
											type='Primary'
										>
											Login
										</saki-button>
									</div>
								) : (
									children
								)}
							</div>
						</saki-chat-layout>
					</div>
					<SettingsComponent></SettingsComponent>
					<UserLoginComponent></UserLoginComponent>
					<GroupInfoComponent></GroupInfoComponent>
					<UserInfoComponent></UserInfoComponent>
					<CallComponent></CallComponent>
				</>
			</div>
		</>
	)
}

export default ChatLayout
