'use client';

import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

function IdleTimer({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!session) return;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                console.log("User inactive for 10 minutes, logging out...");
                signOut({ callbackUrl: "/" });
            }, 10 * 60 * 1000); // 10 minutes
        };

        // Initial start
        resetTimer();

        // Event listeners
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const handleActivity = () => resetTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [session]);

    return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchInterval={5 * 60}>
            <IdleTimer>
                {children}
            </IdleTimer>
        </SessionProvider>
    );
}
