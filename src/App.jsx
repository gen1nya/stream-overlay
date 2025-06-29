import React from 'react';
import {Routes, Route, BrowserRouter} from 'react-router-dom';
import AuthScreen from './components/app/AuthScreen';
import Dashboard from './components/app/Dashboard';
import ChatOverlay from "./components/chat/ChatOverlay";
import Settings from "./components/app/SettingsComponent";
import LoadingComponent from "./components/app/LoadingComponent";
import WrongPageComponent  from "./components/app/WrongPageComponent";
import PreviewComponent from "./components/chat/PreviewComponent";
import AudioPlayerComponent from "./components/player/AudioPlayerComponent";
import FFTBars from "./components/player/FFTBars";
import ModernAudioPlayer from "./components/player/ModerAudioPlayer";
import FFTDonut from "./components/player/FFTDonut";


export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/audio" element={<AudioPlayerComponent/>} />
                <Route path="/audio-fft" element={<FFTDonut/>} />
                <Route path="/audio-modern" element={<ModernAudioPlayer/>} />
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