<script>
    import { onMount } from "svelte";

    let date = new Date();
    let timeString;

    // reactive statement: updates whenever `date` changes
    $: timeString = formatTime(date);

    function formatTime(date) {
        let h = date.getHours();
        let m = date.getMinutes();
        let s = date.getSeconds();
        let session = "AM";

        if (h === 0) h = 12;
        if (h > 12) {
            h -= 12;
            session = "PM";
        }

        h = h < 10 ? "0" + h : h;
        m = m < 10 ? "0" + m : m;
        s = s < 10 ? "0" + s : s;

        return `${h}:${m}:${s} ${session}`;
    }

    onMount(() => {
        const interval = setInterval(() => {
            date = new Date();
        }, 1000);

        return () => clearInterval(interval);
    });
</script>

<div class="bg-slate-50 p-3 shadow-lg rounded-lg border border-slate-200 w-full max-w-md flex items-center justify-center">
  <p class="clock text-sky-600 text-4xl">{timeString}</p>
</div>

<style>
  .clock {
    font-family: Orbitron;
    letter-spacing: 7px;
  }
</style>

