import React, { useState } from 'react';
import { Connection, loadConnection, saveConnection } from './config';
import { TokenGate } from './TokenGate';
import { ChatView } from './ChatView';

// QR-scanned URLs carry the token as a query param so the user has
// zero keystrokes to onboard. Read it before anything else and persist
// to localStorage. We intentionally do NOT strip the token from the
// URL — on iOS, "Add to Home Screen" creates an isolated storage
// context that does not share localStorage with Safari, so the only
// reliable way to pass the token into the home-screen app is to keep
// it in the URL that iOS saves at bookmark time.
function consumeTokenFromUrl(): Connection | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return null;
    const baseUrl = window.location.origin;
    const conn: Connection = { baseUrl, token };
    saveConnection(conn);
    return conn;
}

export function App() {
    const [conn, setConn] = useState<Connection | null>(() => {
        const fromUrl = consumeTokenFromUrl();
        return fromUrl ?? loadConnection();
    });

    if (!conn) {
        return <TokenGate onConnected={setConn}/>;
    }
    return <ChatView conn={conn} onReset={() => setConn(null)}/>;
}
