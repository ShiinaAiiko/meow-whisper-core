import { LocalCache, WebStorage } from '@nyanyajs/utils'

export const cacheInit = () => {
	const cache = {
		storage: new WebStorage<string, any>({
			storage: 'IndexedDB',
			baseLabel: 'MWC-Cache',
		}),
		mapStorage: new LocalCache<string, any>({
			key: 'MWC-Cache',
			platform: 'Web',
		}),
		new: <V = any>({ label }: { label: string }) => {
			return {
				set: (k: string, v: V) => {
					cache.mapStorage.Set(label + k, v)
					cache.storage.set(label + k, v).then()
				},
				get: (k: string): V => {
					const v = cache.mapStorage.Get(label + k)
					return v
				},
				delete: (k: string) => {
					cache.mapStorage.Delete(label + k)
					cache.storage.delete(label + k).then()
				},
			}
		},
		size() {
			return 0
		},
	}
	cache.storage.getAll().then((v) => {
		v.forEach((sv) => {
			cache.mapStorage.Set(sv.key, sv.value)
		})
	})
	return cache
}
