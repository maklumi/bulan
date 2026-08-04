<script>
  import {
    format,
    addDays,
    set,
    differenceInCalendarDays,
    isValid,
  } from "date-fns";

  import { tambah, resetvalue } from "../stor";

  export let handleClick;
  let lmp = new Date();
  let edd = addDays(lmp, 280);
  let rightDate = new Date();
  let givenWeeks = 0;
  let givenDays = 0;
  let today = new Date();

  $: start = [
    lmp.getFullYear(),
    pad(lmp.getMonth() + 1, 2),
    pad(lmp.getDate(), 2),
  ].join("-");

  $: endDate = [
    edd.getFullYear(),
    pad(edd.getMonth() + 1, 2),
    pad(edd.getDate(), 2),
  ].join("-");

  $: gest = difference(rightDate, lmp);
  $: week14 = toStr(addDays(lmp, 98));
  $: week20 = toStr(addDays(lmp, 140));
  $: week30 = toStr(addDays(lmp, 210));
  $: week33 = toStr(addDays(lmp, 231));
  $: week38 = format(addDays(lmp, 266), "d-MMM-yyyy E");
  $: countedDate = calculateDate(givenWeeks, givenDays);

  function toStr(date) {
    try {
      return format(date, "d-MMM-yyyy");
    } catch (error) {
      console.log(error.message);
      return "-";
    }
  }

  function pad(x, len) {
    x = String(x);
    while (x.length < len) x = `0${x}`;
    return x;
  }

  function handleLMP(event) {
    let arr = event.target.value.split("-");
    if (isNotValid(arr)) return;
    lmp = set(new Date(), { year: arr[0], month: arr[1] - 1, date: arr[2] });
    edd = addDays(lmp, 280);
  }

  function handleEDD(event) {
    let arr = event.target.value.split("-");
    if (isNotValid(arr)) return;
    edd = set(new Date(), { year: arr[0], month: arr[1] - 1, date: arr[2] });
    lmp = addDays(edd, -280);
  }

  function isNotValid(arr) {
    return (
      arr.length === 1 || parseInt(arr[0]) < 1000 || parseInt(arr[0]) > 3000
    );
  }

  function difference(firstDate, secondDate) {
    let daysDif = differenceInCalendarDays(firstDate, secondDate);
    let newgest = { week: Math.floor(daysDif / 7), days: daysDif % 7 };
    tambah(format(lmp, "d-MMM-yyyy HH:mm"), newgest);
    return newgest;
  }

  function calculateDate(w, d) {
    let days = w * 7 + d;
    return addDays(lmp, days);
  }

  $: handlereset($resetvalue);

  function handlereset(resetvalue) {
    lmp = new Date();
    givenWeeks = 0;
    givenDays = 0;
    searchDate = format(lmp, "yyyy-MM-dd");
    start = searchDate;
  }

  $: searchDate = isValid(countedDate)
    ? format(countedDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  function handleSearchDate(event) {
    let arr = event.target.value.split("-");
    if (isNotValid(arr)) return;
    let adate = set(new Date(), {
      year: arr[0],
      month: arr[1] - 1,
      date: arr[2],
    });
    let newgest = difference(adate, lmp);
    givenWeeks = newgest.week;
    givenDays = newgest.days;
  }
</script>

<div
  class="bg-slate-50 inline-block p-3 shadow-lg rounded-lg border border-slate-200 w-full max-w-md"
>
  <div>
    <div class="component-header">Obstetric Calendar</div>
    <button
      class="bg-teal-600 hover:bg-teal-700 text-white py-1 px-3 rounded m-2"
      on:click={() => handleClick()}
    >
      Reset
    </button>
  </div>

  <table class="table-auto w-fit mx-auto text-slate-800 border-collapse">
    <tbody>
      <tr id="lmp" class="bg-blue-100">
        <td class="font-medium">LMP:</td>
        <td>
          <input
            type="date"
            value={start}
            on:input={handleLMP}
            max="9999-12-31"
            class="border border-slate-300 rounded px-2"
          />
        </td>
      </tr>

      <tr id="edd" class="bg-blue-200">
        <td class="font-medium">EDD:</td>
        <td>
          <input
            type="date"
            value={endDate}
            on:change={handleEDD}
            max="9999-12-31"
            class="border border-slate-300 rounded px-2"
          />
        </td>
      </tr>

      <tr id="today" class="uppercase font-medium tracking-wide">
        <td>Today is</td>
        <td>{format(today, "d/M/yy h:mm b")}</td>
      </tr>

      <tr id="gest" class="bg-green-100 font-semibold">
        <td>Gestation:</td>
        <td id="gestval">
          {gest.week ? gest.week : "0"}
          {gest.week > 1 ? "weeks" : "week"}
          {gest.days ? gest.days : "0"}
          {gest.days > 1 ? "days" : "day"}
        </td>
      </tr>

      <tr class="font-light"><td>14 weeks:</td><td>{week14}</td></tr>
      <tr class="font-light"><td>20 weeks:</td><td>{week20}</td></tr>
      <tr class="font-light"><td>30 weeks:</td><td>{week30}</td></tr>
      <tr class="font-light"><td>33 weeks:</td><td>{week33}</td></tr>
      <tr class="font-light"><td>38 weeks:</td><td>{week38}</td></tr>

      <tr id="weday" class="bg-yellow-100">
        <td>
          <span>
            <input
              type="number"
              class="w-12 border border-slate-300 rounded px-1"
              bind:value={givenWeeks}
            />
            W
            <input
              type="number"
              class="w-12 border border-slate-300 rounded px-1"
              bind:value={givenDays}
            />
            D:
          </span>
        </td>
        <td>
          <input
            type="date"
            value={searchDate}
            on:change={handleSearchDate}
            max="9999-12-31"
            class="border border-slate-300 rounded px-2"
          />
        </td>
      </tr>
    </tbody>
  </table>
</div>
