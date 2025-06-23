import React from 'react';
import {Routes, Route, BrowserRouter} from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ChatOverlay from "./components/ChatOverlay";
import Settings from "./components/SettingsComponent";
import LoadingComponent from "./components/LoadingComponent";
import WrongPageComponent  from "./components/WrongPageComponent";
import PreviewComponent from "./components/PreviewComponent";
import AudioPlayerComponent from "./components/AudioPlayerComponent";
import FFTBars from "./components/FFTBars";


export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/audio" element={<AudioPlayerComponent/>} />
                <Route path="/audio-fft" element={<FFTBars/>} />
                <Route path="/preview" element={<PreviewComponent/>}/>
                <Route path="/loading" element={<LoadingComponent/>} />
                <Route path="/settings" element={<Settings/>} />
                <Route path="/chat-overlay" element={<ChatOverlay/>} />
                <Route path="/dashboard" element={<Dashboard/>} />
                <Route path="/auth" element={<AuthScreen/>} />
                <Route path="*" element={ <WrongPageComponent/> }/>
            </Routes>
        </BrowserRouter>
    );
}