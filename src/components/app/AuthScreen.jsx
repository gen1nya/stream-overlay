import React from 'react';
import {authorize, onAccountReady, openExternalLink} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 60px);
    text-align: center;
`;

const Title = styled.h2`
  font-size: 24px;
  margin-bottom: 24px;
`;

const AuthButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  background-color: #9146ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #772ce8;
  }
`;

const Footer = styled.footer`
    position: fixed;
    bottom: 0;
    width: 100%;
    background: #100b23;
    padding: 10px 0;
    display: flex;
    justify-content: center;
    gap: 16px;
    border-top: 1px solid #333;
`;

const FooterButton = styled.button`
    box-sizing: border-box;
    height: 40px;
    padding: 0 16px;
    font-size: 14px;
    color: #fff;
    background: #1f1f1f;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;

    white-space: nowrap;
    width: fit-content;
    flex: 0 0 auto;
    align-self: flex-start;

    &:hover {
        background: #232323;
        border: 1px solid #646cff;
    }
`;

export default function AuthScreen() {
    const navigate = useNavigate();

    const handleAuth = async () => {
        const success = await authorize();
        if (success) {
            navigate('/dashboard', { replace: true });
            onAccountReady();
        }
    };

    const handlerOpenSettings = () => {
        navigate('/settings', { replace: false });
    };

    const openPlayer1 = () => {
        openExternalLink('http://localhost:5173/audio-modern');
    };

    const openPlayer2 = () => {
        openExternalLink('http://localhost:5173/audio');
    };

    const openDemoFFTColumns = () => {
        openExternalLink('http://localhost:5173/audio-fft-linear-demo');
    }

    const openDemoFFTRing = () => {
        openExternalLink('http://localhost:5173/audio-fft-round-demo');
    }

    return (
        <>
            <Container>
                <Title>🎮 Добро пожаловать в Оверлеешную!</Title>
                <AuthButton onClick={handleAuth}>Авторизоваться через Twitch</AuthButton>
            </Container>

            <Footer>
                <FooterButton onClick={handlerOpenSettings}>Настройки</FooterButton>
                <FooterButton onClick={openPlayer2}>Плеер №2 (пластинка)</FooterButton>
                <FooterButton onClick={openPlayer1}>Плеер №1</FooterButton>
                <FooterButton onClick={openDemoFFTColumns}>Демо FFT (столбцы)</FooterButton>
                <FooterButton onClick={openDemoFFTRing}>Демо FFT (кольцо)</FooterButton>
            </Footer>
        </>
    );
}
