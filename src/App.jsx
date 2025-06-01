import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ChatOverlay from "./components/ChatOverlay";
import Settings from "./components/SettingsComponent";
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { defaultTheme } from './theme';
import LoadingComponent from "./components/LoadingComponent";
import WrongPageComponent  from "./components/WrongPageComponent";
import PreviewComponent from "./components/PreviewComponent";
import AudioPlayerComponent from "./components/AudioPlayerComponent";

const Global = createGlobalStyle`
  body {
    margin: 0;
    font-family: system-ui;
    background: ${({ theme }) => theme.primary}22;
  }
`;

export default function App() {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? JSON.parse(saved) : defaultTheme;
    });

    useEffect(() => {
        localStorage.setItem('theme', JSON.stringify(theme));
    }, [theme]);

    return (
        <ThemeProvider theme={theme}>
            <Router>
                <Routes>
                    <Route path="/audio" element={<AudioPlayerComponent />} />
                    <Route path="/preview" element={<PreviewComponent/>}/>
                    <Route path="/loading" element={<LoadingComponent/>} />
                    <Route path="/settings" element={<Settings current={theme} onChange={setTheme} />} />
                    <Route path="/chat-overlay" element={<ChatOverlay />} />
                    <Route path="/dashboard" element={<Dashboard onLogout={ () => {} } />} />
                    <Route path="/auth" element={<AuthScreen  onAuthorized={ () => {} } />} />
                    <Route path="*" element={ <WrongPageComponent/> }/>
                </Routes>
            </Router>
        </ThemeProvider>
    );
}