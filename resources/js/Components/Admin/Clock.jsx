import { useEffect, useState } from 'react';

const TIME_FMT = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});
const DATE_FMT = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
});

/**
 * Real clock, not decoration — Asia/Manila, the same timezone the app itself
 * runs on (APP_TIMEZONE, see CLAUDE.md's Conventions section), so what staff
 * see here always matches what "Placed 04 Sep, 1:07pm" on an order means.
 */
export default function Clock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="hidden flex-col items-end border-r border-white/10 pr-3.5 sm:flex admin-light:border-ink-900/10">
            <span className="font-oswald text-sm font-semibold tabular-nums tracking-wide text-white admin-light:text-ink-900">
                {TIME_FMT.format(now)}
            </span>
            <span className="text-[10px] tracking-wide text-white/40 admin-light:text-ink-900/50">
                {DATE_FMT.format(now)} &middot; PHT
            </span>
        </div>
    );
}
