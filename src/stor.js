import { writable } from 'svelte/store'
import { getTime, differenceInMilliseconds } from 'date-fns'

const senaraiTarikh = writable([])

export const tambah = (tarikh, newgest) => {
  const tnow = new Date()

  senaraiTarikh.update((values) => {
    if (values.length > 0) {
      const lastItem = values[values.length - 1]
      const lastItemDate = new Date(lastItem.id)
      const elapsed = differenceInMilliseconds(tnow, lastItemDate)
      if (elapsed > 10000) {
        // if more than 10 seconds, create
        const newobj = { id: getTime(tnow), masa: tarikh, gest: newgest }
        return [...values, newobj]
      } else {
        // if less than that, update the last one
        const index = values.findIndex((item) => item.id === lastItem.id)
        values[index].masa = tarikh
        values[index].gest = newgest
        return [...values]
      }
    } else {
      // for initialization when values is empty
      return [{ id: getTime(tnow), masa: tarikh, gest: newgest }]
    }
  })
}

export const padam = (id) => {
  senaraiTarikh.update((senaraiAsal) => {
    return senaraiAsal.filter((item) => item.id !== id)
  })
}

export const resetvalue = writable(false)

export default senaraiTarikh
