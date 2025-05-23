import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ChatOverlay from "./components/ChatOverlay";
import { getTokens } from './services/api';

export default function App() {
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        try {
            getTokens().then(tokens => {
                setAuthorized(!!tokens);
            });
        } catch (e) {
            console.log(e);
        }

    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/chat-overlay" element={<ChatOverlay />} />
                <Route
                    path="*"
                    element={
                        authorized ? (
                            <Dashboard onLogout={() => setAuthorized(false)} />
                        ) : (
                            <AuthScreen onAuthorized={() => setAuthorized(true)} />
                        )
                    }
                />
            </Routes>
        </Router>
    );
}