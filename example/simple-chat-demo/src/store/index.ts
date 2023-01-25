import {
	createSlice,
	createAsyncThunk,
	combineReducers,
	configureStore,
} from '@reduxjs/toolkit'
import exp from 'constants'
// import thunk from 'redux-thunk'
import { useDispatch } from 'react-redux'
import { storageMethods, storageSlice } from './storage'
import { configMethods, configSlice } from './config'
import { userMethods, userSlice } from './user'
import { apiMethods, apiSlice } from './api'
import { nsocketioMethods, nsocketioSlice } from './nsocketio'
import { ssoMethods, ssoSlice } from './sso'
import { encryptionMethods, encryptionSlice } from './encryption'
import { mwcMethods, mwcSlice } from './mwc'
import { contactsMethods, contactsSlice } from './contacts'
import { groupMethods, groupSlice } from './group'
import { messagesMethods, messagesSlice } from './messages'

export interface ActionParams<T = any> {
	type: string
	payload: T
}

const rootReducer = combineReducers({
	storage: storageSlice.reducer,
	config: configSlice.reducer,
	user: userSlice.reducer,
	api: apiSlice.reducer,
	nsocketio: nsocketioSlice.reducer,
	sso: ssoSlice.reducer,
	mwc: mwcSlice.reducer,
	encryption: encryptionSlice.reducer,
	contacts: contactsSlice.reducer,
	group: groupSlice.reducer,
	messages: messagesSlice.reducer,
})

const store = configureStore({
	reducer: rootReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: false,
		}),
})

export {
	userSlice,
	nsocketioSlice,
	storageSlice,
	configSlice,
	ssoSlice,
	mwcSlice,
	encryptionSlice,
	contactsSlice,
	groupSlice,
	messagesSlice,
}
export const methods = {
	storage: storageMethods,
	config: configMethods,
	user: userMethods,
	api: apiMethods,
	nsocketio: nsocketioMethods,
	sso: ssoMethods,
	mwc: mwcMethods,
	encryption: encryptionMethods,
	contacts: contactsMethods,
	group: groupMethods,
	messages: messagesMethods,
}

// console.log(store.getState())

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>()

export default store
