import { consola } from 'consola'
import { acceptHMRUpdate, defineStore } from 'pinia'

export const useDataStore = defineStore('data', {

  state: () => ({
    appVersion: useRuntimeConfig().public.APP_VERSION,
    products: [],
  }),
  actions: {
    async initData() {
      if (this.products.length === 0) {
        consola.debug('fetching data ...')
        await fetch('/api/products').then(res => res.json()).then((d) => {
          this.products = d.data
        }).catch(error => consola.error(error))
      }
    },
  },

})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useDataStore, import.meta.hot))
