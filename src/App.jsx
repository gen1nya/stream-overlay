import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ChatOverlay from "./components/ChatOverlay";
import { getTokens } from './services/api';
import Settings from "./components/SettingsComponent";
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { defaultTheme } from './theme';

const Global = createGlobalStyle`
  body {
    margin: 0;
    font-family: system-ui;
    background: ${({ theme }) => theme.primary}22;   /* «припудрим» фон */
  }
`;

export default function App() {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? JSON.parse(saved) : defaultTheme;
    });

    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        localStorage.setItem('theme', JSON.stringify(theme));
        try {
            getTokens().then(tokens => {
                setAuthorized(!!tokens);
            });
        } catch (e) {
            console.log(e);
        }

    }, [theme]);

    return (
        <ThemeProvider theme={theme}>
            <Router>
                <Routes>
                    <Route path="/settings" element={<Settings current={theme} onChange={setTheme} />} />
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
        </ThemeProvider>
    );
}