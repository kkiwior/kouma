export function useFormatters() {
    const formatTime = (dateString: string): string => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const formatPercentage = (value: number): string => {
        if (!value && value !== 0) return '';
        return `${value}%`;
    };

    const resultColor = (result: string): string => {
        if (result.startsWith('passed')) return 'text-emerald-500';
        switch (result) {
            case 'failed':
                return 'text-red-500';
            case 'undetermined':
                return 'text-amber-500';
            default:
                return 'text-slate-400';
        }
    };

    const resultBgColor = (result: string): string => {
        if (result.startsWith('passed')) return 'bg-emerald-500';
        switch (result) {
            case 'failed':
                return 'bg-red-500';
            case 'undetermined':
                return 'bg-amber-500';
            default:
                return 'bg-slate-400';
        }
    };

    const resultBadgeClasses = (result: string): string => {
        if (result.startsWith('passed')) return 'bg-emerald-100 text-emerald-800';
        switch (result) {
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'undetermined':
                return 'bg-amber-100 text-amber-800';
            default:
                return 'bg-slate-100 text-slate-600';
        }
    };

    const displayResult = (caseResult: string, comprehensiveCaseResult?: string): string => {
        if (caseResult === 'failed' && comprehensiveCaseResult === 'passed') {
            return 'passed (ignored)';
        }
        return caseResult;
    };

    return { formatTime, formatPercentage, resultColor, resultBgColor, resultBadgeClasses, displayResult };
}
