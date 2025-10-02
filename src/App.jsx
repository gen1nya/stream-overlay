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
import ModernAudioPlayer from "./components/player/ModerAudioPlayer";
import RoundFFTDemo from "./components/player/RoundFFTDemo";
import LinearFFTDemo from "./components/player/LinearFFTDemo";
import {createGlobalStyle} from "styled-components";
import {preloadAllFonts} from "./components/utils/fontsCache";
import fonts from './components/utils/cyrillic_fonts_minimal.json';
import WaveformDemo from "./components/player/WaveformDemo";
import FollowersGoalWidget from "./components/followers/FollowersGoalWidget";

const GlobalStyle = createGlobalStyle`
    html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent !important;
        overflow: hidden;
    }
    html, body {
        scroll-behavior: auto;
    }
`;


export default function App() {
    preloadAllFonts(fonts);
    return (
        <>
            <GlobalStyle/>
            <BrowserRouter>
                <Routes>
                    <Route path="/audio-fft-round-demo" element={<RoundFFTDemo/>} />
                    <Route path="/audio-fft-linear-demo" element={<LinearFFTDemo/>} />
                    <Route path="/audio-waveform-demo" element={<WaveformDemo/>} />
                    <Route path="/audio" element={<AudioPlayerComponent/>} />
                    <Route path="/audio-modern" element={<ModernAudioPlayer/>} />
                    <Route path="/preview" element={<PreviewComponent/>}/>
                    <Route path="/loading" element={<LoadingComponent/>} />
                    <Route path="/settings" element={<Settings/>} />
                    <Route path="/chat-overlay" element={<ChatOverlay/>} />
                    <Route path="/new-followers-overlay" element={<FollowersGoalWidget/>} />
                    <Route path="/dashboard" element={<Dashboard/>} />
                    <Route path="/auth" element={<AuthScreen/>} />
                    <Route path="*" element={ <WrongPageComponent/> }/>
                </Routes>
            </BrowserRouter>
        </>
    );
}