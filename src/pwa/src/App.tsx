import React, { useState } from 'react';
import { Connection, loadConnection } from './config';
import { TokenGate } from './TokenGate';
import { ChatView } from './ChatView';

export function App() {
    const [conn, setConn] = useState<Connection | null>(() => loadConnection());

    if (!conn) {
        return <TokenGate onConnected={setConn}/>;
    }
    return <ChatView conn={conn} onReset={() => setConn(null)}/>;
}
