import { writable } from 'svelte/store'

const senaraiTarikh = writable([])

export const tambah = (tarikh, newgest) => {
  const hhmm = tarikh.slice(-5)

  senaraiTarikh.update((values) => {
    const objindex = values.findIndex((obj) => obj.id === hhmm)
    if (objindex === -1) {
      const newobj = { id: hhmm, masa: tarikh, gest: newgest }
      return [...values, newobj]
    } else {
      values[objindex].masa = tarikh
      values[objindex].gest = newgest
      return [...values]
    }
  })
}

export const resetvalue = writable(false)

export default senaraiTarikh
