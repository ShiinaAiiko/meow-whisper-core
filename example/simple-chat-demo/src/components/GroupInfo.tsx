import React, { useEffect, useState } from 'react'
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
} from '../store'
import './GroupInfo.scss'
import { useTranslation } from 'react-i18next'
import { prompt, alert, snackbar } from '@saki-ui/core'
import { eventTarget } from '../store/config'
import { SyncOff } from './Icon'
import { protoRoot } from '../protos'

const GroupInfoComponent = () => {
	const { t, i18n } = useTranslation('index-header')
	const config = useSelector((state: RootState) => state.config)
	const contacts = useSelector((state: RootState) => state.contacts)
	const mwc = useSelector((state: RootState) => state.mwc)
	const appStatus = useSelector((state: RootState) => state.config.status)
	const user = useSelector((state: RootState) => state.user)

	const [activeTabLabel, setActiveTabLabel] = useState('')
	const [groupInfo, setGroupInfo] = useState<protoRoot.group.IGroup>()
	const [members, setMembers] = useState<protoRoot.group.IGroupMembers[]>([])
	const [membersLoading, setMembersLoading] = useState('loading')

	const dispatch = useDispatch<AppDispatch>()

	const location = useLocation()
	const history = useNavigate()

	useEffect(() => {
		if (config.modal.groupId) {
			setActiveTabLabel('')
			getGroupInfo()
		}
	}, [config.modal.groupId])

	const getGroupInfo = async () => {
		console.log(config.modal.groupId)

		const res = await mwc.sdk?.api.group.getGroupInfo({
			groupId: config.modal.groupId,
		})
		console.log('getGroupInfo', res)
		if (res?.code === 200 && res?.data?.group) {
			setGroupInfo(res?.data?.group)
			getMembers()
		}
	}

	const getMembers = async () => {
		// if (members?.length !== 0) return
		setMembersLoading('loading')
		const res = await mwc.sdk?.api.group.getGroupMembers({
			groupId: config.modal.groupId,
		})
		console.log('getMembers', res)
		if (res?.code === 200) {
			setMembers(res?.data?.list || [])
		}
		setMembersLoading('loaded')
	}

	// useEffect(() => {
	// 	if (activeTabLabel === 'Members') {
	// 		getMembers()
	// 	}
	// }, [activeTabLabel])

	return (
		<saki-modal
			visible={!!config.modal.groupId}
			width='100%'
			height='100%'
			max-width={config.deviceType === 'Mobile' ? 'auto' : '420px'}
			max-height={config.deviceType === 'Mobile' ? 'auto' : '560px'}
			mask
			border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
			border={config.deviceType === 'Mobile' ? 'none' : ''}
			mask-closable='false'
			background-color='#fff'
			ref={bindEvent({
				close: () => {
					dispatch(configSlice.actions.setModalGroupId(''))
				},
			})}
		>
			<div className={'group-info-component ' + config.deviceType}>
				<saki-modal-header
					ref={bindEvent({
						close: () => {
							dispatch(configSlice.actions.setModalGroupId(''))
						},
					})}
					close-icon
					title='Group Info'
				></saki-modal-header>
				<div className='gic-container'>
					<div className='gic-header'>
						<saki-row width='100%' align-items='center'>
							<saki-col span={2}>
								<saki-row align-items='center'>
									<saki-col span={0}>
										<saki-avatar
											width='70px'
											height='70px'
											border-radius='50%'
											src={groupInfo?.avatar}
											nickname={!groupInfo?.avatar ? groupInfo?.name : ''}
										></saki-avatar>
									</saki-col>
									<saki-col padding='0 0 0 10px' span={1}>
										<div className='gic-h-info'>
											<div className='gic-h-i-nickname text-two-elipsis'>
												{groupInfo?.name}
											</div>
											<div className='gic-h-i-memebers'>
												{members.length} members
											</div>
										</div>
									</saki-col>
								</saki-row>
							</saki-col>
							<saki-col justify-content='flex-end' span={0}>
								{user.userInfo.uid === groupInfo?.authorId ? (
									<saki-button
										width='50px'
										height='50px'
										type='CircleIconGrayHover'
									>
										<saki-icon
											width='20px'
											height='20px'
											type='Pen'
											color='#999'
										></saki-icon>
									</saki-button>
								) : (
									''
								)}
							</saki-col>
						</saki-row>
					</div>
					<saki-tabs
						type='Flex'
						full
						// header-background-color='rgb(245, 245, 245)'
						header-max-width='740px'
						// header-border-bottom='none'
						header-padding='0 10px'
						header-item-min-width='80px'
						active-tab-label={activeTabLabel}
						ref={bindEvent({
							tap: (e) => {
								console.log('changename tap', e)
								setActiveTabLabel(e.detail.label)
								// setOpenDropDownMenu(false)
							},
						})}
					>
						<saki-tabs-item font-size='14px' label='Info' name={'Info'}>
							<saki-scroll-view mode='Inherit'>
								<div className='gic-info-page'>
									<saki-card hide-title hide-subtitle>
										<saki-title
											level='5'
											color='default'
											margin='10px 0 10px 0'
										>
											GroupId
										</saki-title>
										<div>{groupInfo?.id}</div>
									</saki-card>
									<saki-row
										margin='30px 0 0 0'
										align-items='center'
										flex-direction='column'
									>
										<saki-col>
											<saki-button
												ref={bindEvent({
													tap: () => {},
												})}
												width='160px'
												padding='8px 0px'
												margin='0 0 0 10px'
												font-size='14px'
												type='Primary'
											>
												Send message
											</saki-button>
										</saki-col>
										<saki-col>
											<saki-button
												ref={bindEvent({
													tap: () => {},
												})}
												width='160px'
												padding='8px 0px'
												margin='10px 0 0 10px'
												font-size='14px'
												type='Normal'
											>
												Share
											</saki-button>
										</saki-col>
									</saki-row>
								</div>
							</saki-scroll-view>
						</saki-tabs-item>
						<saki-tabs-item font-size='14px' label='Members' name={'Members'}>
							<div className='gic-members-page'>
								<saki-row align-items='center' padding='4px 10px 4px 20px'>
									<saki-col>
										<saki-title level='4' color='default'>
											{members.length} Members
										</saki-title>
									</saki-col>
									<saki-col justify-content='flex-end'>
										<saki-button type='CircleIconGrayHover'>
											<saki-icon
												width='16px'
												height='16px'
												type='AddUser'
												color='#999'
											></saki-icon>
										</saki-button>
									</saki-col>
								</saki-row>
								<div
									style={{
										width: '100%',
										height: 'calc(100% - 44px)',
									}}
								>
									<saki-scroll-view mode='Inherit'>
										<saki-chat-layout-contact>
											{members.map((v, i) => {
												return (
													<saki-chat-layout-contact-item
														ref={bindEvent({
															tap: () => {
																dispatch(
																	configSlice.actions.setModalUserId(
																		v.userInfo?.uid || ''
																	)
																)
															},
														})}
														key={i}
														padding='10px 20px'
														avatar-size='36px'
														avatar-text={
															!v.userInfo?.avatar ? v.userInfo?.nickname : ''
														}
														nickname={v.userInfo?.nickname}
														margin='0'
														nickname-font-size='14px'
														username-font-size='13px'
														hover-background-color='rgba(247,247,247)'
														username={
															(v?.lastSeenTime || 0) > 0
																? 'last seen time ' + v?.lastSeenTime
																: 'sasasasa'
														}
														display-icons-layout-width='auto'
														last-message-time={''}
													></saki-chat-layout-contact-item>
												)
											})}
										</saki-chat-layout-contact>
										<saki-scroll-loading
											type={membersLoading}
										></saki-scroll-loading>
									</saki-scroll-view>
								</div>
							</div>
						</saki-tabs-item>
						<saki-tabs-item font-size='14px' label='Settings' name={'Settings'}>
							<saki-scroll-view mode='Inherit'>
								<div className='gic-settings-page'>
									<saki-row
										margin='10px 0 0 0'
										align-items='center'
										flex-direction='column'
									>
										<saki-col>
											<saki-button
												ref={bindEvent({
													tap: () => {
														if (user.userInfo.uid === groupInfo?.authorId) {
															dispatch(
																methods.group.disbandGroup({
																	groupId: String(groupInfo?.id),
																})
															)
														} else {
															dispatch(
																methods.group.leaveGroup({
																	groupId: String(groupInfo?.id),
																})
															)
														}
													},
												})}
												width='160px'
												padding='8px 0px'
												margin='10px 0 0 10px'
												font-size='14px'
												color='var(--saki-default-color)'
												type='Normal'
											>
												{user.userInfo.uid === groupInfo?.authorId
													? 'Disband'
													: 'Leave'}
											</saki-button>
										</saki-col>
									</saki-row>
									<div className='gic-s-buttons'></div>
								</div>
							</saki-scroll-view>
						</saki-tabs-item>
					</saki-tabs>
				</div>
			</div>
		</saki-modal>
	)
}

export default GroupInfoComponent
