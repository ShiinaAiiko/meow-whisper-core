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
	contactsSlice,
} from '../store'
import './AddContact.scss'
import { useTranslation } from 'react-i18next'
import { prompt, alert, snackbar } from '@saki-ui/core'
import { eventTarget } from '../store/config'
import { SyncOff } from './Icon'

const AddContactComponent = ({
	visible,
	onChange,
}: {
	visible: boolean
	onChange: (visible: boolean) => void
}) => {
	const { t, i18n } = useTranslation('index-header')
	const config = useSelector((state: RootState) => state.config)
	const mwc = useSelector((state: RootState) => state.mwc)
	const nsocketio = useSelector((state: RootState) => state.nsocketio)
	const appStatus = useSelector((state: RootState) => state.config.status)
	const user = useSelector((state: RootState) => state.user)

	const [uid, setUid] = useState('100001')

	const dispatch = useDispatch<AppDispatch>()

	const location = useLocation()
	const history = useNavigate()

	const searchUser = async () => {
		let message = ''
		const getUser = await mwc.sdk?.api.contact.searchContact({
			uid,
		})
		console.log(getUser)
		if (getUser?.code === 200) {
			// 预留 检测是否需要校验，需要则出输入备注的弹框
			const add = await dispatch(
				methods.contacts.addContact({
					uid,
					remark: '',
				})
			)
			console.log(add)
		} else {
			message = '内容不存在'
			snackbar({
				message: message,
				horizontal: 'center',
				vertical: 'top',
				autoHideDuration: 2000,
				backgroundColor: 'var(--saki-default-color)',
				color: '#fff',
			}).open()
		}
	}

	return (
		<saki-modal
			visible={visible}
			width='100%'
			height='100%'
			max-width={config.deviceType === 'Mobile' ? '100%' : '420px'}
			max-height={config.deviceType === 'Mobile' ? '100%' : '180px'}
			mask
			border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
			border={config.deviceType === 'Mobile' ? 'none' : ''}
			mask-closable='false'
			background-color='#fff'
			ref={bindEvent({
				close: (e) => {
					onChange?.(false)
				},
			})}
		>
			<saki-modal-header
				ref={bindEvent({
					close: () => {
						onChange?.(false)
					},
				})}
				close-icon
				title='Add contact'
			></saki-modal-header>
			<div className={'add-contact-dropdown ' + config.deviceType}>
				<div className='acd-input'>
					<saki-input
						type='Text'
						height='56px'
						placeholder='Contact id'
						placeholder-animation='MoveUp'
						value={uid}
						ref={bindEvent({
							changevalue: (e) => {
								setUid(e.detail)
							},
						})}
					></saki-input>
				</div>

				<div className='acd-buttons'>
					<saki-button
						ref={bindEvent({
							tap: () => {
								searchUser()
							},
						})}
						padding='6px 18px'
						margin='0 0 0 10px'
						font-size='14px'
						type='Primary'
					>
						Add
					</saki-button>
				</div>
			</div>
		</saki-modal>
	)
}

export default AddContactComponent
