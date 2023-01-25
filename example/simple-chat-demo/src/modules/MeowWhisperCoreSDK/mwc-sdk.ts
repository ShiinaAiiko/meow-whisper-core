import axios from 'axios'
import * as nyanyalog from 'nyanyajs-log'
import protoRoot from '../../protos/proto'
import { Buffer } from 'buffer'
import md5 from 'blueimp-md5'
import {
	request,
	AES,
	RSA,
	userAgent,
	WebStorage,
	Encryption,
	dhkea,
	DiffieHellman,
	NEventListener,
	compareUnicodeOrder,
	deepCopy,
} from '@nyanyajs/utils'
import {
	interceptors,
	Response,
	ResponseData,
	protobuf,
} from '@nyanyajs/utils/dist/request'
import Long from 'long'
import { UserAgent } from '@nyanyajs/utils/dist/userAgent'
import { MSCnsocketio, MSCnsocketioOption } from './mwc-nsocketio'
import { cacheInit } from './cache'
import { apiUrls, apiVersion, getApiUrl } from './api'
import moment from 'moment'

let RequestType = protoRoot.base.RequestType
let ResponseType = protoRoot.base.ResponseType
let ResponseEncryptDataType = protoRoot.base.ResponseEncryptDataType
let RequestEncryptDataType = protoRoot.base.RequestEncryptDataType

const { ParamsEncode, ResponseDecode } = protobuf
const P = ParamsEncode
const R = ResponseDecode

// console.log('protobuf', protobuf, interceptors)
export class MeowWhisperCoreSDK extends NEventListener<
	'encryption-status' | 'response'
> {
	static protoRoot = protoRoot
	url = ''
	appId = ''
	// appKey = ''
	apiVersion = apiVersion
	apiUrls = apiUrls
	getApiUrl = getApiUrl
	api: ReturnType<this['initApi']>
	encryption: ReturnType<this['initEncryption']>
	encryptionApi = false
	userInfo: {
		deviceId: string
		token: string
		userAgent: UserAgent
	} = {
		deviceId: '',
		token: '',
		userAgent: userAgent(window.navigator.userAgent),
	}
	publicRsa = {
		publicKey: '',
	}
	nsocketio: MSCnsocketio
	storage: WebStorage
	socketIoConfig: {
		uri: string
		opts: {
			[k: string]: any
		}
	}
	static cache = cacheInit.call(this)

	timeConfig = {
		centerTimeMomentConfig: {
			sameDay: '[Today] HH:mm:ss',
			nextDay: '[Tomorrow] HH:mm:ss',
			nextWeek: 'dddd H:mm:ss',
			lastDay: '[Yesterday] HH:mm:ss',
			lastWeek: 'YY-MM-DD HH:mm:ss',
			sameElse: 'YYYY-MM-DD HH:mm:ss',
		},
		sendTimeFullMomentConfig: {
			sameDay: '[Today] HH:mm:ss',
			nextDay: '[Tomorrow] HH:mm:ss',
			nextWeek: 'dddd H:mm:ss',
			lastDay: '[Yesterday] HH:mm:ss',
			lastWeek: 'YY-MM-DD HH:mm:ss',
			sameElse: 'YYYY-MM-DD HH:mm:ss',
		},
		dialogTimeMomentConfig: {
			sameDay: 'HH:mm',
			nextDay: '[Tomorrow] HH:mm',
			nextWeek: 'dddd',
			lastDay: '[Yesterday] HH:mm',
			lastWeek: 'YY-MM-DD',
			sameElse: 'YYYY-MM-DD',
		},
		lastSeenTimeMomentConfig: {
			sameDay: '[last seen at] HH:mm',
			nextDay: '[Tomorrow] HH:mm',
			nextWeek: 'dddd',
			lastDay: '[last seen yesterday at] HH:mm',
			lastWeek: '[last seen ] YY-MM-DD',
			sameElse: '[last seen ] YYYY-MM-DD',
		},
	}

	constructor({
		url,
		appId,
		// appKey,
		encryptionApi = false,
		publicRsa,
		storage,
		socketIoConfig,
	}: {
		url: string
		appId: string
		// appKey: string
		encryptionApi?: boolean
		publicRsa?: {
			publicKey: string
		}
		storage: WebStorage
		socketIoConfig: {
			uri: string
			opts: {
				[k: string]: any
			}
		}
	}) {
		super()
		console.log('初始化MeowWhisperCoreSDK')
		this.url = url
		this.appId = appId
		// this.appKey = appKey
		this.storage = storage
		this.socketIoConfig = socketIoConfig

		this.encryptionApi = encryptionApi
		if (this.encryptionApi) {
			if (publicRsa) {
				this.publicRsa = publicRsa
			} else {
				console.error('publicRsa不存在')
			}
		}
		this.api = this.initApi() as any
		this.encryption = this.initEncryption() as any

		// 考虑使用Protobuf
		this.initInterceptors()
		this.nsocketio = new MSCnsocketio({
			sdk: this,
		})
	}

	initInterceptors() {
		interceptors.request.use((config) => {
			if ((config.url || '').indexOf(this.url) >= 0) {
				let data: protoRoot.base.IRequestEncryptDataType = {}
				// const { token, deviceId, userAgent } = getUserInfo()
				// console.log(String(config.url).indexOf(api.baseUrl) >= 0 && token)
				// && token
				if (String(config.url).indexOf(this.url) >= 0) {
					// config.data.token = token
					// config.data.deviceId = deviceId
				}
				// nyanyalog.info("axiosrequest",JSON.parse(JSON.stringify(config.data)))
				// 发送请求也需要序列号
				// 当没有远程publicKey的时候也要加密
				if (this.encryptionApi) {
					// console.log(!store.state.encryption.client?.aes.key)
					// 没有完成加密
					// const aesKey = store.state.storage.ws.getSync('ec-aesKey')
					// const userKey = store.state.storage.ws.getSync('ec-userKey')

					const { aesKey, userKey } = this.encryption.getAesKeySync()

					// console.log(
					// 	'ec-aesKey',
					// 	aesKey,
					// 	userKey,
					// 	Math.random().toString(),
					// 	Math.random()
					// )
					if (!aesKey || !userKey) {
						if (this.userInfo.token) {
							this.encryption.init()
						}
						// 1、获取并加密临时TempAESKey
						const aesKey = md5(
							Math.random().toString() +
								Math.random().toString() +
								Math.random().toString() +
								new Date().toString()
						)
						// console.log('aesKey', aesKey)
						const aesKeyEnStr = RSA.encrypt(this.publicRsa.publicKey, aesKey)
						// console.log('aesKeyEnStr', aesKeyEnStr)
						// console.log(config.data)
						const dataEnStr = AES.encrypt(config.data, aesKey)
						// console.log(config.data.data.length)
						// console.log(config.data.token.length)
						// console.log(dataEnStr.value.length)
						// console.log(aesKeyEnStr.length)
						data.data = dataEnStr.value
						data.tempAesKey = aesKeyEnStr
						// console.log(config.data)
					} else {
						const enData = AES.encrypt(config.data, aesKey)

						data.data = enData.value
						data.key = userKey
					}
				}
				// if (config?.config?.dataType === 'protobuf') {
				// 	config.responseType = 'arraybuffer'
				// }
				// config.data = {
				// 	a: 121,
				// }
				// console.log(' this.user', this.user)
				const requestData: any = RequestType.encode(
					RequestType.create({
						token: this.userInfo.token || '',
						deviceId: this.userInfo.deviceId || '',
						userAgent: this.userInfo.userAgent,
						appId: this.appId,
						data: Buffer.from(
							RequestEncryptDataType.encode(
								RequestEncryptDataType.create(data)
							).finish() as any,
							'base64'
						).toString('base64'),
					})
				).finish()
				config.data = {
					data: Buffer.from(requestData, 'base64').toString('base64'),
				}

				console.log('config', config)
			}
			return config
		})

		interceptors.response.use((response) => {
			// console.log(response.data)
			const config: any = response.config
			if ((config.url || '').indexOf(this.url) >= 0) {
				if (
					response.data.protobuf &&
					response.headers['content-type'] === 'application/x-protobuf'
				) {
					if (this.encryptionApi) {
						let data = ResponseEncryptDataType.decode(
							// Buffer.from(response.data.protobuf, 'utf-8')
							new Uint8Array(Buffer.from(response.data.protobuf, 'base64'))
						)

						// const aesKey = store.state.storage.ws.getSync('ec-aesKey')

						const { aesKey, userKey } = this.encryption.getAesKeySync()

						// console.log(data)
						// 用户无AESKEY，所以返临时key
						if (!data.key) {
							data.key = aesKey
						}
						response.data = {
							...response.data,
							...JSON.parse(AES.decrypt(data.data, data.key, data.key)),
						}
					} else {
						let data = ResponseType.decode(
							// Buffer.from(response.data.protobuf, 'utf-8')
							new Uint8Array(Buffer.from(response.data.protobuf, 'base64'))
						)
						response.data = {
							...data,
						}
					}

					delete response.data.protobuf
				}
			}
			this.dispatch('response', response?.data)
			return response
		})
	}
	setToken(token: string) {
		this.userInfo.token = token
	}
	setDeviceId(deviceId: string) {
		this.userInfo.deviceId = deviceId
	}
	methods = {
		formatSimpleAnonymousUserInfo: (
			v: protoRoot.user.ISimpleAnonymousUserInfo | null | undefined
		) => {
			if (v) {
				v.nickname = v.nickname || ''
				v.avatar = v.avatar || ''
				v.bio = v.bio || ''
				v.lastSeenTime = v.lastSeenTime || -1
				console.log(v)
			}
			return v
		},
		formatContact: (v: protoRoot.contact.IContact) => {
			if (v) {
				v.status = v.status || 0
				if (v.permissions) {
					v.permissions.e2ee = !!v.permissions?.e2ee
				}
				v.users?.forEach((sv) => {
					sv.receiveMessage = !!sv.receiveMessage
					sv.nickname = sv.nickname || ''

					sv.userInfo = this.methods.formatSimpleAnonymousUserInfo(sv.userInfo)
					v.lastSeenTime = sv.userInfo?.lastSeenTime
				})
			}
			return v
		},
		formatGroupMembers: (v: protoRoot.group.IGroupMembers) => {
			if (v) {
				v.nickname = v.nickname || ''
				v.nickname = v.nickname || ''
				if (v.permissions) {
					v.permissions.receiveMessage = !!v.permissions?.receiveMessage
				}
				v.userInfo = this.methods.formatSimpleAnonymousUserInfo(v.userInfo)
			}
			return v
		},
		getRoomId: (...ids: string[]) => {
			ids.sort((a, b) => {
				return compareUnicodeOrder(a, b)
			})
			return md5(this.appId + ids.join(''))
		},
		getLastMessage: (
			message: protoRoot.message.IMessages | null | undefined
		) => {
			// 暂定仅文本
			return message?.message?.replace(/<[^>]+>/gi, '') || ''
		},
		getLastMessageTime: (time: number) => {
			// 暂定仅文本
			// moment()
			return moment(time * 1000).calendar(
				this.timeConfig.dialogTimeMomentConfig
			)
		},
		getLastSeenTime: (time: number) => {
			// 暂定仅文本
			// moment()

			return moment(time * 1000).calendar(
				this.timeConfig.lastSeenTimeMomentConfig
			)
		},
		getType: (id: string): 'Contact' | 'Group' => {
			// 暂定仅文本
			if (id.substring(0, 1) === 'G') {
				return 'Group'
			}
			return 'Contact'
		},
	}
	initApi() {
		return {
			// createAccount: async () => {
			// 	console.log('createAccount', this.url)
			// 	const res = await request({
			// 		method: 'POST',
			// 		url: this.url + this.apiVersion + '/user/createAccount',
			// 		data: P<protoRoot.user.CreateAccount.IRequest>(
			// 			{
			// 				appId: this.appId,
			// 				appKey: this.appKey,
			// 				uid: '21321',
			// 				nickname: 'sasasa',
			// 			},
			// 			protoRoot.user.CreateAccount.Request
			// 		),
			// 	})
			// 	console.log(res)
			// },
			createSSOAppToken: async () => {
				console.log('createSSOAppToken', this.url)
				const res = R<protoRoot.sso.CreateAppToken.IResponse>(
					await request({
						method: 'GET',
						url: getApiUrl(this.url, 'createAppToken'),
						data: P<protoRoot.sso.CreateAppToken.IRequest>(
							{
								appId: this.appId,
							},
							protoRoot.sso.CreateAppToken.Request
						),
					}),
					protoRoot.sso.CreateAppToken.Response
				)
				console.log('createSSOAppToken', res)
				if (res.code === 200) {
					return String(res.data.token)
				}
				return ''
			},
			verifySSOAppToken: async () => {
				console.log('createSSOAppToken', this.url)
				const res = R<protoRoot.sso.CreateAppToken.IResponse>(
					await request({
						method: 'GET',
						url: getApiUrl(this.url, 'verifyAppToken'),
						data: P<protoRoot.sso.CreateAppToken.IRequest>(
							{
								appId: this.appId,
							},
							protoRoot.sso.CreateAppToken.Request
						),
					}),
					protoRoot.sso.CreateAppToken.Response
				)
				if (res.code === 200) {
					return String(res.data.token)
				}
				return ''
			},
			exchangeKey: async ({
				tempAESKey,
				RSASign,
				RSAPublicKey,
				DHPublicKey,
			}: {
				tempAESKey: string
				RSASign: string
				RSAPublicKey: string
				DHPublicKey: string
			}) => {
				const res = R<protoRoot.encryption.ExchangeKey.IResponse>(
					await request({
						method: 'POST',
						url: getApiUrl(this.url, 'encryptionExchangeKey'),
						data: P<protoRoot.encryption.ExchangeKey.IRequest>(
							{
								tempAESKey,
								RSASign,
								RSAPublicKey,
								DHPublicKey,
							},
							protoRoot.encryption.ExchangeKey.Request
						),
					}),
					protoRoot.encryption.ExchangeKey.Response
				)
				// console.log(res, getApiUrl(this.url, 'encryptionExchangeKey'))
				if (res.code === 200) {
					return res.data
				}
				return undefined
			},
			contact: {
				searchContact: async ({ uid }: { uid: string }) => {
					const res = R<protoRoot.contact.SearchContact.IResponse>(
						await request({
							method: 'GET',
							url: getApiUrl(this.url, 'searchContact'),
							data: P<protoRoot.contact.SearchContact.IRequest>(
								{
									uid,
								},
								protoRoot.contact.SearchContact.Request
							),
						}),
						protoRoot.contact.SearchContact.Response
					)
					return res
				},
				searchUserInfoList: async ({ uid }: { uid: string[] }) => {
					const res = R<protoRoot.contact.SearchUserInfoList.IResponse>(
						await request({
							method: 'GET',
							url: getApiUrl(this.url, 'searchUserInfoList'),
							data: P<protoRoot.contact.SearchUserInfoList.IRequest>(
								{
									uid,
								},
								protoRoot.contact.SearchUserInfoList.Request
							),
						}),
						protoRoot.contact.SearchUserInfoList.Response
					)
					if (res.code === 200) {
						res.data.list?.map((v) =>
							this.methods.formatSimpleAnonymousUserInfo(v)
						)
					}
					return res
				},
				addContact: async ({
					uid,
					remark,
				}: {
					uid: string
					remark: string
				}) => {
					const res = R<protoRoot.contact.AddContact.IResponse>(
						await request({
							method: 'POST',
							url: getApiUrl(this.url, 'addContact'),
							data: P<protoRoot.contact.AddContact.IRequest>(
								{
									uid,
									remark,
								},
								protoRoot.contact.AddContact.Request
							),
						}),
						protoRoot.contact.AddContact.Response
					)
					return res
				},
				deleteContact: async ({ uid }: { uid: string }) => {
					const res = R<protoRoot.contact.DeleteContact.IResponse>(
						await request({
							method: 'POST',
							url: getApiUrl(this.url, 'deleteContact'),
							data: P<protoRoot.contact.DeleteContact.IRequest>(
								{
									uid,
								},
								protoRoot.contact.DeleteContact.Request
							),
						}),
						protoRoot.contact.DeleteContact.Response
					)
					return res
				},
				getContactList: async () => {
					const res = R<protoRoot.contact.GetContactList.IResponse>(
						await request({
							method: 'GET',
							url: getApiUrl(this.url, 'getContactList'),
							data: P<protoRoot.contact.GetContactList.IRequest>(
								{},
								protoRoot.contact.GetContactList.Request
							),
						}),
						protoRoot.contact.GetContactList.Response
					)
					console.log('res', deepCopy(res))
					if (res.code === 200) {
						res.data.list?.map((v) => this.methods.formatContact(v))
					}
					return res
				},
			},
			group: {
				newGroup: async ({
					name,
					avatar,
					members,
				}: {
					name: string
					avatar?: string
					members: {
						type: 'Join' | 'Leave'
						uid: string
					}[]
				}) => {
					const res = R<protoRoot.group.NewGroup.IResponse>(
						await request({
							method: 'POST',
							url: getApiUrl(this.url, 'newGroup'),
							data: P<protoRoot.group.NewGroup.IRequest>(
								{
									name,
									avatar,
									members,
								},
								protoRoot.group.NewGroup.Request
							),
						}),
						protoRoot.group.NewGroup.Response
					)
					if (res.code === 200) {
						// res.data.list?.map((v) => this.methods.formatContact(v))
					}
					return res
				},
				getAllJoinedGroups: async () => {
					const res = R<protoRoot.group.GetAllJoinedGroups.IResponse>(
						await request({
							method: 'GET',
							url: getApiUrl(this.url, 'getAllJoinedGroups'),
							data: P<protoRoot.group.GetAllJoinedGroups.IRequest>(
								{},
								protoRoot.group.GetAllJoinedGroups.Request
							),
						}),
						protoRoot.group.GetAllJoinedGroups.Response
					)
					if (res.code === 200) {
						// res.data.list?.map((v) => this.methods.formatContact(v))
					}
					return res
				},
				getGroupInfo: async ({ groupId }: { groupId: string }) => {
					const res = R<protoRoot.group.GetGroupInfo.IResponse>(
						await request({
							method: 'GET',
							url: getApiUrl(this.url, 'getGroupInfo'),
							data: P<protoRoot.group.GetGroupInfo.IRequest>(
								{ groupId },
								protoRoot.group.GetGroupInfo.Request
							),
						}),
						protoRoot.group.GetGroupInfo.Response
					)
					if (res.code === 200) {
						// res.data.list?.map((v) => this.methods.formatContact(v))
					}
					return res
				},
				getGroupMembers: async ({ groupId }: { groupId: string }) => {
					const res = R<protoRoot.group.GetGroupMembers.IResponse>(
						await request({
							method: 'GET',
							url: getApiUrl(this.url, 'getGroupMembers'),
							data: P<protoRoot.group.GetGroupMembers.IRequest>(
								{ groupId },
								protoRoot.group.GetGroupMembers.Request
							),
						}),
						protoRoot.group.GetGroupMembers.Response
					)
					if (res.code === 200) {
						res.data.list?.map((v) => this.methods.formatGroupMembers(v))
					}
					return res
				},
				leaveGroup: async ({
					groupId,
					uid,
				}: {
					groupId: string
					uid: string
				}) => {
					const res = R<protoRoot.group.LeaveGroup.IResponse>(
						await request({
							method: 'POST',
							url: getApiUrl(this.url, 'leaveGroup'),
							data: P<protoRoot.group.LeaveGroup.IRequest>(
								{ groupId, uid },
								protoRoot.group.LeaveGroup.Request
							),
						}),
						protoRoot.group.LeaveGroup.Response
					)
					return res
				},
				joinGroup: async ({
					groupId,
					uid,
					remark,
				}: {
					groupId: string
					uid: string
					remark: string
				}) => {
					const res = R<protoRoot.group.JoinGroup.IResponse>(
						await request({
							method: 'POST',
							url: getApiUrl(this.url, 'joinGroup'),
							data: P<protoRoot.group.JoinGroup.IRequest>(
								{ groupId, uid, remark },
								protoRoot.group.JoinGroup.Request
							),
						}),
						protoRoot.group.JoinGroup.Response
					)
					return res
				},
				disbandGroup: async ({ groupId }: { groupId: string }) => {
					const res = R<protoRoot.group.DisbandGroup.IResponse>(
						await request({
							method: 'POST',
							url: getApiUrl(this.url, 'disbandGroup'),
							data: P<protoRoot.group.DisbandGroup.IRequest>(
								{ groupId },
								protoRoot.group.DisbandGroup.Request
							),
						}),
						protoRoot.group.DisbandGroup.Response
					)
					return res
				},
			},
			message: {
				getRecentChatDialogueList: async () => {
					const res = R<protoRoot.message.GetRecentChatDialogueList.IResponse>(
						await request({
							method: 'GET',
							url: getApiUrl(this.url, 'getRecentChatDialogueList'),
							data: P<protoRoot.message.GetRecentChatDialogueList.IRequest>(
								{},
								protoRoot.message.GetRecentChatDialogueList.Request
							),
						}),
						protoRoot.message.GetRecentChatDialogueList.Response
					)
					if (res.code === 200) {
						// res.data.list?.map((v) => this.methods.formatContact(v))
					}
					return res
				},
				// socketio api
				sendMessage: async (data: protoRoot.message.SendMessage.IRequest) => {
					const res = R<protoRoot.message.SendMessage.IResponse>(
						(await this.nsocketio.client?.emit({
							namespace: this.nsocketio.namespace[apiVersion].chat,
							eventName:
								this.nsocketio.eventName[apiVersion].requestEventName[
									'sendMessage'
								],
							params: P<protoRoot.message.SendMessage.IRequest>(
								data,
								protoRoot.message.SendMessage.Request
							),
						})) as any,
						protoRoot.message.SendMessage.Response
					)
					return res
				},
				// socketio api
				joinRoom: async ({ roomIds }: { roomIds: string[] }) => {
					const res = R<protoRoot.message.JoinRoom.IResponse>(
						(await this.nsocketio.client?.emit({
							namespace: this.nsocketio.namespace[apiVersion].chat,
							eventName:
								this.nsocketio.eventName[apiVersion].requestEventName[
									'joinRoom'
								],
							params: P<protoRoot.message.JoinRoom.IRequest>(
								{
									roomIds,
								},
								protoRoot.message.JoinRoom.Request
							),
						})) as any,
						protoRoot.message.JoinRoom.Response
					)
					return res
				},
				getHistoricalMessages: async ({
					roomId,
					pageNum,
					pageSize,
					type,
					timeRange,
				}: {
					roomId: string
					pageNum: number
					pageSize: number
					type: 'Group' | 'Contact'
					timeRange: {
						start: number
						end: number
					}
				}) => {
					const res = R<protoRoot.message.GetHistoricalMessages.IResponse>(
						await request({
							method: 'GET',
							url: getApiUrl(this.url, 'getHistoricalMessages'),
							data: P<protoRoot.message.GetHistoricalMessages.IRequest>(
								{
									roomId,
									pageNum,
									pageSize,
									type,
									timeRange,
								},
								protoRoot.message.GetHistoricalMessages.Request
							),
						}),
						protoRoot.message.GetHistoricalMessages.Response
					)
					if (res.code === 200) {
						// res.data.list?.map((v) => this.methods.formatContact(v))
					}
					return res
				},
				readAllMessages: async ({ roomId }: { roomId: string }) => {
					const res = R<protoRoot.message.ReadAllMessages.IResponse>(
						await request({
							method: 'POST',
							url: getApiUrl(this.url, 'readAllMessages'),
							data: P<protoRoot.message.ReadAllMessages.IRequest>(
								{
									roomId,
								},
								protoRoot.message.ReadAllMessages.Request
							),
						}),
						protoRoot.message.ReadAllMessages.Response
					)
					if (res.code === 200) {
						// res.data.list?.map((v) => this.methods.formatContact(v))
					}
					return res
				},
			},
		}
	}

	initEncryption() {
		const setStatus = (t: typeof this['encryption']['status']) => {
			this.encryption.status = t
			this.dispatch('encryption-status', t)
		}
		return {
			status: 'fail' as 'getting' | 'success' | 'fail',
			key: {
				aesKey: '',
				rsaKey: '',
			},
			clear: async () => {
				await this.storage.delete('ec-aesKey')
				await this.storage.delete('ec-userKey')
				await this.storage.delete('ec-deadline')
			},
			init: async () => {
				console.log(2132131)
				const e = this.encryption
				if (e.status === 'getting') return

				setStatus('getting')

				console.log('正在进行加密通讯')
				console.time('加密通讯成功！')

				let getKey = await this.encryption.getAesKey()

				// console.log('getKey', getKey)

				if (getKey.aesKey && getKey.userKey) {
					console.timeEnd('加密通讯成功！')
					setStatus('success')
					return
				}

				// 1、获取或生成本地RSA证书
				let localRsaKey = await this.storage.getAndSet(
					'localRsaKey',
					async (v) => {
						if (!v?.privateKey || !v?.sign || !v?.sign) {
							const rk = await RSA.getRsaKey()
							return {
								privateKey: rk.privateKey,
								publicKey: rk.publicKey,
								sign: RSA.getSign(rk.privateKey, rk.publicKey),
							}
						}
						return v
					}
				)
				// console.log('localRsaKey', localRsaKey)
				let serverRSAPBK = this.publicRsa.publicKey
				const enURILocalRSAPBK = encodeURIComponent(localRsaKey.publicKey)

				// 为公钥加签
				const rsaSign = localRsaKey.sign
				// console.log('本地RSA', rsaSign, rsaKey.publicKey)
				// console.log(RSA.verifySign(rsaKey.publicKey, rsaKey.publicKey, rsaSign))
				// console.log('远端RSA publicKey', api.RSA.publicKey)

				// 2、 生成DH秘钥
				const dhA = new dhkea.DHKea({
					bitLen: 1024,
				})

				// console.log('dhA.publicKey.toString()', dhA.publicKey.toString())

				// 2、利用DHPublicKey生成个临时AES秘钥
				const tempAesKey = md5(dhA.publicKey.toString())
				// console.log('tempAesKey', tempAesKey)

				// 用服务端公钥将临时AES秘钥加密
				const tempAesKeyEnStr = RSA.encrypt(serverRSAPBK, tempAesKey)
				// console.log('tempAesKeyEnStr', tempAesKeyEnStr)

				// 用临时AES秘钥为公钥签名加密
				const rsaSignEnStr = AES.encrypt(rsaSign, tempAesKey)
				// console.log('rsaSignEnStr', rsaSignEnStr.value)
				// console.log('rsaSign', rsaSign)

				// console.log('clientRSAPublicKey', clientRSAPublicKey)
				// console.log(decodeURIComponent(clientRSAPublicKey))
				// 用临时AES秘钥为Local RSA PublicKey加密
				const rsaPublicKeyEnStr = AES.encrypt(enURILocalRSAPBK, tempAesKey)
				// console.log('rsaPublicKeyEnStr', rsaPublicKeyEnStr.value)

				// 用临时AES秘钥为DH Public Key加密
				const dhPublicKeyEnStr = AES.encrypt(
					dhA.publicKey.toString(),
					tempAesKey
				)
				// console.log('dhPublicKeyEnStr', dhPublicKeyEnStr.value)

				// console.log("prime",dhA)
				// const dhB = new dhkea.DHKea({
				// 	bitLen: 1024,
				// })
				// const signA = dhA.getSharedKey(dhB.publicKey)
				// const signB = dhB.getSharedKey(dhA.publicKey)
				// console.log(signA)
				// console.log(signB)
				// console.log(signA === signB)
				const sendPublicKey = await this.api.exchangeKey({
					tempAESKey: tempAesKeyEnStr,
					RSASign: rsaSignEnStr.value,
					RSAPublicKey: rsaPublicKeyEnStr.value,
					DHPublicKey: dhPublicKeyEnStr.value,
				})
				console.log('sendPublicKey', sendPublicKey)
				if (sendPublicKey) {
					const rsaSignDeStr = AES.decrypt(
						sendPublicKey.RSASign || '',
						tempAesKey,
						''
					)
					// console.log('sendPublicKey.data.RSASign', sendPublicKey.data.RSASign)
					// console.log('pi.RSA.publicKey', api, rsaSignDeStr)
					// console.log(RSA.getSign(api.RSA.privateKey, 'a'))
					// console.log(
					// 	RSA.verifySign(
					// 		RSA.getSign(api.RSA.privateKey, "a"),
					// 		api.RSA.publicKey,
					// 		rsaSignDeStr
					// 	)
					// )

					if (
						RSA.verifySign(localRsaKey.publicKey, serverRSAPBK, rsaSignDeStr)
					) {
						const dhPublicKeyDeStr = AES.decrypt(
							sendPublicKey.DHPublicKey || '',
							tempAesKey,
							''
						)
						const userAESKeyDeStr = AES.decrypt(
							sendPublicKey.userAESKey || '',
							tempAesKey,
							''
						)
						if (!userAESKeyDeStr || !dhPublicKeyDeStr) {
							console.log('加密通讯签名失败')
							setStatus('fail')
							return
						}
						const key = dhA.getSharedKey(BigInt(dhPublicKeyDeStr))
						// console.log(key.toString())
						// console.log(md5(key.toString()).toUpperCase(), userAESKeyDeStr)

						await this.storage.set(
							'ec-aesKey',
							md5(key.toString()).toUpperCase()
						)
						await this.storage.set('ec-userKey', userAESKeyDeStr)
						await this.storage.set('ec-deadline', sendPublicKey.deadline)

						console.timeEnd('加密通讯成功！')
						setStatus('success')
						// store.state.storage.ws.set('ec-userKey')
					} else {
						console.log('加密通讯签名失败')
						setStatus('fail')
					}
				} else {
					console.log('加密通讯签名失败')
					setStatus('fail')
				}
			},
			getAesKey: async (
				type?: 'Init'
			): Promise<{
				aesKey: string
				userKey: string
			}> => {
				const aesKey = await this.storage.get('ec-aesKey')
				const userKey = await this.storage.get('ec-userKey')
				const deadline = await this.storage.get('ec-deadline')

				if (
					!aesKey ||
					!userKey ||
					!deadline ||
					deadline <= Math.floor(new Date().getTime() / 1000)
				) {
					if (type === 'Init') {
						await this.encryption.init()
						if (this.encryption.status === 'success') {
							const aesKey = await this.storage.get('ec-aesKey')
							const userKey = await this.storage.get('ec-userKey')
							return {
								aesKey,
								userKey,
							}
						}
					}
					return {
						aesKey: '',
						userKey: '',
					}
				}
				return {
					aesKey,
					userKey,
				}
			},
			getAesKeySync: (): {
				aesKey: string
				userKey: string
			} => {
				const aesKey = this.storage.getSync('ec-aesKey')
				const userKey = this.storage.getSync('ec-userKey')
				const deadline = this.storage.getSync('ec-deadline')

				if (
					!aesKey ||
					!userKey ||
					!deadline ||
					deadline <= Math.floor(new Date().getTime() / 1000)
				) {
					return {
						aesKey: '',
						userKey: '',
					}
				}
				return {
					aesKey,
					userKey,
				}
			},
		}
	}
}
