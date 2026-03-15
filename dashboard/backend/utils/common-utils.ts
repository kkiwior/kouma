export function formatTime(d: Date) {
    function addZero(t: number) {
        return Number(t) < 10 ? `0${t}` : t;
    }

    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${addZero(d.getHours())}:${addZero(
        d.getMinutes(),
    )}:${addZero(d.getSeconds())}`;
}
