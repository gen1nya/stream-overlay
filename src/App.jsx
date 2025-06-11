import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ChatOverlay from "./components/ChatOverlay";
import Settings from "./components/SettingsComponent";
import LoadingComponent from "./components/LoadingComponent";
import WrongPageComponent  from "./components/WrongPageComponent";
import PreviewComponent from "./components/PreviewComponent";
import AudioPlayerComponent from "./components/AudioPlayerComponent";


export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/audio" element={<AudioPlayerComponent />} />
                <Route path="/preview" element={<PreviewComponent/>}/>
                <Route path="/loading" element={<LoadingComponent/>} />
                <Route path="/settings" element={<Settings/>} />
                <Route path="/chat-overlay" element={<ChatOverlay />} />
                <Route path="/dashboard" element={<Dashboard onLogout={ () => {} } />} />
                <Route path="/auth" element={<AuthScreen  onAuthorized={ () => {} } />} />
                <Route path="*" element={ <WrongPageComponent/> }/>
            </Routes>
        </Router>
    );
}