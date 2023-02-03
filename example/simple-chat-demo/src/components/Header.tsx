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
import './Header.scss'
import { useTranslation } from 'react-i18next'
import { prompt, alert, snackbar } from '@saki-ui/core'
import { eventTarget } from '../store/config'
import { SyncOff } from './Icon'

const HeaderComponent = () => {
	const { t, i18n } = useTranslation('index-header')
	const config = useSelector((state: RootState) => state.config)
	const nsocketio = useSelector((state: RootState) => state.nsocketio)
	const appStatus = useSelector((state: RootState) => state.config.status)
	const user = useSelector((state: RootState) => state.user)

	const [noteContextMenuEl, setNoteContextMenuEl] = useState<any>()
	const [openDropDownMenu, setOpenDropDownMenu] = useState(false)
	const [openAddDropDownMenu, setOpenAddDropDownMenu] = useState(false)
	const [openSettingDropDownMenu, setOpenSettingDropDownMenu] = useState(false)
	const [openUserDropDownMenu, setOpenUserDropDownMenu] = useState(false)
	const [showBackIcon, setShowBackIcon] = useState(false)

	const dispatch = useDispatch<AppDispatch>()

	const location = useLocation()
	const history = useNavigate()

	useEffect(() => {
		// console.log(
		// 	'location',
		// 	location.pathname === '/m' || location.pathname === '/m/p'
		// )
		if (location.pathname === '/m' || location.pathname === '/m/p') {
			// dispatch(configSlice.actions.setHeaderCenter(false))
		} else {
			// dispatch(configSlice.actions.setHeaderCenter(true))
		}
		// if (location.pathname === '/') {
		// 	dispatch(configSlice.actions.setHeaderCenter(true))
		// }
		if (
			location.pathname === '/m/n' ||
			location.pathname === '/m/c' ||
			location.pathname === '/m/p'
		) {
			setShowBackIcon(true)
		} else {
			setShowBackIcon(false)
		}
	}, [location])

	return (
		<div className='header-component'>
			<div className='qv-h-left'>
				<saki-transition
					animation-duration={500}
					class-name='header-left'
					in={!showBackIcon}
				>
					<div className='logo text-elipsis'>
						{showBackIcon ? (
							''
						) : (
							<div
								className='logo-info'
								title={t('appTitle', {
									ns: 'common',
								})}
							>
								<img src={config.origin + '/logo192.png'} alt='' />
								<span className='text-elipsis'>
									{t('appTitle', {
										ns: 'common',
									})}
								</span>
							</div>
						)}
					</div>
				</saki-transition>
			</div>

			<div className='qv-h-right'>
				{config.isConnectionError.pc ? (
					<div className='qv-h-r-connecting'>
						<saki-animation-loading
							type='rotateEaseInOut'
							width='20px'
							height='20px'
							border='3px'
							border-color='var(--default-color)'
						/>
						<span
							style={{
								color: '#555',
								margin: '0 0 4px 0',
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
						margin: '0 4px 0 4px',
					}}
				>
					<meow-apps-dropdown
						ref={bindEvent({
							openUrl: (e) => {
								switch (config.platform) {
									case 'Electron':
										const { shell } = window.require('electron')
										shell.openExternal(e.detail)
										break
									case 'Web':
										window.open(e.detail, '_blank')
										break

									default:
										break
								}
							},
						})}
						disable-open-web-page
						language={i18n.language}
					/>
				</div>

				<saki-dropdown
					style={{
						display: user.isLogin ? 'block' : 'none',
					}}
					visible={openUserDropDownMenu}
					floating-direction='Left'
					ref={bindEvent({
						close: (e) => {
							setOpenUserDropDownMenu(false)
						},
					})}
				>
					<saki-button
						ref={bindEvent({
							tap: () => {
								setOpenUserDropDownMenu(true)
							},
						})}
						type='CircleIconGrayHover'
						margin='0 0 0 6px'
					>
						<saki-avatar
							className='qv-h-r-u-avatar'
							width='30px'
							height='30px'
							border-radius='50%'
							nickname={user.userInfo?.nickname?.toUpperCase()}
							src={user.userInfo.avatar || ''}
							alt=''
						/>
					</saki-button>
					<div
						onClick={() => {
							setOpenUserDropDownMenu(true)
							// onSettings?.('Account')
							// setOpenUserDropDownMenu(!openUserDropDownMenu)
						}}
						className='qv-h-r-user'
					></div>
					<div slot='main'>
						<saki-menu
							ref={bindEvent({
								selectvalue: async (e) => {
									console.log(e.detail.value)
									switch (e.detail.value) {
										case 'Settings':
											// history?.('/settings')

											dispatch(configSlice.actions.setSettingVisible(true))
											break
										case 'Logout':
											dispatch(userSlice.actions.logout({}))
											break

										default:
											break
									}
									setOpenUserDropDownMenu(false)
								},
							})}
						>
							<saki-menu-item
								width='150px'
								padding='10px 18px'
								value={'Settings'}
							>
								<div className='qv-h-r-u-item'>
									<saki-icon
										color='#666'
										type='Settings'
										margin='0 6px 0 0'
									></saki-icon>
									<span>
										{t('title', {
											ns: 'settings',
										})}
									</span>
								</div>
							</saki-menu-item>
							<saki-menu-item
								width='150px'
								padding='10px 18px'
								value={'Logout'}
							>
								<div className='qv-h-r-u-item'>
									<svg
										className='icon'
										viewBox='0 0 1024 1024'
										version='1.1'
										xmlns='http://www.w3.org/2000/svg'
										p-id='3480'
									>
										<path
											d='M835.669333 554.666667h-473.173333A42.453333 42.453333 0 0 1 320 512a42.666667 42.666667 0 0 1 42.474667-42.666667h473.173333l-161.813333-161.834666a42.666667 42.666667 0 0 1 60.330666-60.330667l234.666667 234.666667a42.666667 42.666667 0 0 1 0 60.330666l-234.666667 234.666667a42.666667 42.666667 0 0 1-60.330666-60.330667L835.669333 554.666667zM554.666667 42.666667a42.666667 42.666667 0 1 1 0 85.333333H149.525333C137.578667 128 128 137.578667 128 149.482667v725.034666C128 886.4 137.6 896 149.525333 896H554.666667a42.666667 42.666667 0 1 1 0 85.333333H149.525333A106.816 106.816 0 0 1 42.666667 874.517333V149.482667A106.773333 106.773333 0 0 1 149.525333 42.666667H554.666667z'
											fill=''
											p-id='3481'
										></path>
									</svg>
									<span>
										{t('logout', {
											ns: 'common',
										})}
									</span>
								</div>
							</saki-menu-item>
						</saki-menu>
					</div>
				</saki-dropdown>
			</div>
		</div>
	)
}

export default HeaderComponent
