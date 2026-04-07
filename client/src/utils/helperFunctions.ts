import React from "react";

export const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
};

export function fmtPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price);
}

export function closeWsRef(ref: React.MutableRefObject<WebSocket | null>): void {
    if (ref.current) {
        ref.current.close();
        ref.current = null;
    }
}

export function calcBackoffDelay(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
    jitter: number,
): number {
    const safeAttempt = Math.min(attempt, 31);
    const safeJitter  = Math.max(0, Math.min(1, jitter));
    const exp         = Math.min(maxDelayMs, baseDelayMs * 2 ** safeAttempt);
    const jitterRange = exp * safeJitter;
    return exp - jitterRange + Math.random() * jitterRange * 2;
}