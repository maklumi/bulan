<script>
  import { format, addDays, set, differenceInCalendarDays } from 'date-fns'
  import { ms } from 'date-fns/locale'
  import { tambah, resetvalue } from './stor'

  let lmp = new Date()
  let edd = addDays(lmp, 280)
  let rightDate = new Date()
  let givenWeeks = 0
  let givenDays = 0
  let today = new Date()

  $: start = [
    lmp.getFullYear(),
    pad(lmp.getMonth() + 1, 2),
    pad(lmp.getDate(), 2),
  ].join('-')

  $: endDate = [
    edd.getFullYear(),
    pad(edd.getMonth() + 1, 2),
    pad(edd.getDate(), 2),
  ].join('-')

  $: gest = difference(rightDate, lmp)
  $: week20 = toStr(addDays(lmp, 140))
  $: week30 = toStr(addDays(lmp, 210))
  $: week38 = format(addDays(lmp, 266), 'd-MMM-yyyy E')
  $: countedDate = calculateDate(givenWeeks, givenDays)

  function toStr(date) {
    try {
      return format(date, 'd-MMM-yyyy')
    } catch (error) {
      console.log(error.message)
      return '-'
    }
  }

  function pad(x, len) {
    x = String(x)
    while (x.length < len) x = `0${x}`
    return x
  }

  function handleLMP(event) {
    let arr = event.target.value.split('-')
    if (isNotValid(arr)) return
    lmp = set(new Date(), { year: arr[0], month: arr[1] - 1, date: arr[2] })
    edd = addDays(lmp, 280)
    // console.log(`lmp ${arr}`);
  }

  function handleEDD(event) {
    let arr = event.target.value.split('-')
    if (isNotValid(arr)) return
    edd = set(new Date(), { year: arr[0], month: arr[1] - 1, date: arr[2] })
    lmp = addDays(edd, -280)
  }

  function isNotValid(arr) {
    return (
      arr.length === 1 || parseInt(arr[0]) < 1000 || parseInt(arr[0]) > 3000
    )
  }

  function difference(firstDate, secondDate) {
    today = new Date()
    let daysDif = differenceInCalendarDays(firstDate, secondDate)
    let newgest = { week: Math.floor(daysDif / 7), days: daysDif % 7 }
    tambah(format(lmp, 'd-MMM-yyyy HH:mm'), newgest)
    return newgest
  }

  function calculateDate(w, d) {
    let days = w * 7 + d
    return addDays(lmp, days)
  }

  $: somevalue = handlereset($resetvalue)

  function handlereset(resetvalue) {
    lmp = new Date()
    givenWeeks = 0
    givenDays = 0
  }
</script>

<table>
  <tr id="lmp">
    <td>LMP:</td>
    <td>
      <input type="date" value={start} on:input={handleLMP} max="9999-12-31" />
    </td>
  </tr>

  <tr id="edd">
    <td>EDD:</td>
    <td>
      <input
        type="date"
        value={endDate}
        on:change={handleEDD}
        max="9999-12-31" />
    </td>
  </tr>

  <tr id="today">
    <td>Today is</td>
    <td>{format(today, 'd/M/yy h:mm b')}</td>
  </tr>

  <tr id="gest">
    <td>Gestation:</td>
    <td id="gestval">
      {gest.week ? gest.week : '0'} {gest.week > 1 ? 'weeks' : 'week'}
      {gest.days ? gest.days : '0'} {gest.days > 1 ? 'days' : 'day'}
    </td>
  </tr>
  <tr>
    <td>20 weeks:</td>
    <td>{week20}</td>
  </tr>
  <tr>
    <td>30 weeks:</td>
    <td>{week30}</td>
  </tr>
  <tr>
    <td>38 weeks:</td>
    <td>{week38}</td>
  </tr>
  <tr id="weday">
    <td colspan="2">
      <input type="number" style="width:3em" bind:value={givenWeeks} />
      W
      <input type="number" style="width:3em" bind:value={givenDays} />
      D: {toStr(countedDate)}
    </td>
  </tr>

</table>
