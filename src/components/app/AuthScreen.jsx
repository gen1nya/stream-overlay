import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    authorize,
    cancelAuth,
    onAuthCodeReady,
    onAuthPolling,
    onAuthSuccess,
    onAuthError,
    onAuthCancelled,
    removeAuthListeners,
    onAccountReady,
    openExternalLink
} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import RadioGroup from "../utils/TextRadioGroup";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 100px);
    text-align: center;
    padding: 20px;
`;

const Title = styled.h2`
    font-size: 1.5rem;
    font-weight: 600;
    color: #d6d6d6;
    margin-bottom: 32px;
`;

const AuthCard = styled.div`
    width: calc(100% - 24px);
    max-width: 520px;
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border: 1px solid #333;
    border-radius: 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    box-shadow: 
        0 4px 20px rgba(0, 0, 0, 0.3),
        0 0 10px rgba(92, 56, 169, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    overflow: hidden;
`;

const CardHeader = styled.div`
    padding: 20px 24px 16px;
    background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
    border-bottom: 1px solid #444;
`;

const CardContent = styled.div`
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const AuthButton = styled.button`
    padding: 12px 32px;
    font-size: 14px;
    font-weight: 500;
    background: #646cff;
    border: 1px solid #646cff;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: #5a5acf;
        border-color: #5a5acf;
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }

    &:disabled {
        background: #333;
        border-color: #444;
        cursor: not-allowed;
        transform: none;
        opacity: 0.5;
    }
`;

const CancelButton = styled(AuthButton)`
    background: #2a2a2a;
    border-color: #444;

    &:hover {
        background: #333;
        border-color: #555;
    }
`;

const StatusText = styled.p`
    font-size: 14px;
    color: #888;
    margin: 0;
    line-height: 1.6;
`;

const CodeSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SectionLabel = styled.div`
    font-size: 0.85rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 500;
    text-align: left;
`;

const CodeBox = styled.div`
    background: #0f0f0f;
    border: 2px solid #646cff;
    border-radius: 8px;
    padding: 20px;
`;

const Code = styled.div`
    font-size: 36px;
    font-weight: bold;
    color: #646cff;
    letter-spacing: 8px;
    font-family: 'Courier New', monospace;
    user-select: all;
`;

const Link = styled.a`
    color: #646cff;
    text-decoration: none;
    font-size: 14px;
    word-break: break-all;
    padding: 12px 16px;
    background: #0f0f0f;
    border-radius: 8px;
    border: 1px solid #333;
    transition: all 0.2s ease;
    display: block;

    &:hover {
        background: #1a1a1a;
        border-color: #646cff;
        text-decoration: underline;
    }
`;

const QRSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
`;

const QRContainer = styled.div`
    background: white;
    padding: 16px;
    border-radius: 12px;
    display: inline-block;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const QRHint = styled.div`
    font-size: 12px;
    color: #888;
    text-align: center;
    line-height: 1.4;
    max-width: 320px;
`;

const spin = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 3px solid #333;
    border-top-color: #646cff;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    display: inline-block;
    margin-right: 8px;
    vertical-align: middle;
`;

const PollingInfo = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid #333;
    border-radius: 8px;
    color: #888;
    font-size: 14px;
`;

const ErrorBox = styled.div`
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    padding: 16px;
    color: #dc2626;
    text-align: left;

    strong {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
    }

    div {
        font-size: 13px;
        color: #ef4444;
    }
`;

const SuccessBox = styled.div`
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 8px;
    padding: 16px;
    color: #22c55e;
    font-size: 16px;
    font-weight: 500;
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
    transition: all 0.2s ease;

    &:hover {
        background: #232323;
        border: 1px solid #646cff;
    }
`;

const ViewModeSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
`;

export default function AuthScreen() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle');
    const [authData, setAuthData] = useState({
        userCode: '',
        verificationUri: '',
        attempt: 0,
        error: ''
    });
    const [viewMode, setViewMode] = useState('code');

    useEffect(() => {
        onAuthCodeReady((data) => {
            console.log('🔑 Auth code ready:', data);
            setStatus('code-ready');
            setAuthData(prev => ({
                ...prev,
                userCode: data.userCode,
                verificationUri: data.verificationUri
            }));
        });

        onAuthPolling((data) => {
            console.log('⏳ Polling attempt:', data.attempt);
            setStatus('polling');
            setAuthData(prev => ({ ...prev, attempt: data.attempt }));
        });

        onAuthSuccess((data) => {
            console.log('✅ Auth success:', data);
            setStatus('success');
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
                onAccountReady();
            }, 1000);
        });

        onAuthError((data) => {
            console.error('❌ Auth error:', data.message);
            setStatus('error');
            setAuthData(prev => ({ ...prev, error: data.message }));
        });

        onAuthCancelled(() => {
            console.log('🚫 Auth cancelled');
            setStatus('idle');
            setAuthData({ userCode: '', verificationUri: '', attempt: 0, error: '' });
        });

        return () => {
            removeAuthListeners();
        };
    }, [navigate]);

    const handleAuth = async () => {
        setStatus('loading');
        const success = await authorize();

        if (!success) {
            setStatus('error');
            setAuthData(prev => ({ ...prev, error: 'Не удалось начать авторизацию' }));
        }
    };

    const handleCancel = async () => {
        await cancelAuth();
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
    };

    const openDemoFFTRing = () => {
        openExternalLink('http://localhost:5173/audio-fft-round-demo');
    };

    const getFullAuthUrl = () => {
        if (!authData.verificationUri || !authData.userCode) return '';
        return `${authData.verificationUri}?user_code=${authData.userCode}`;
    };

    const isWaitingForAuth = status === 'code-ready' || status === 'polling';

    return (
        <>
            <Container>

                <Title>Ну что, поехали?</Title>
                {/* Idle state */}
                {status === 'idle' && (
                    <AuthCard>
                        <CardHeader>
                            <StatusText style={{ color: '#ccc' }}>
                                Для начала работы необходимо авторизоваться
                            </StatusText>
                        </CardHeader>
                        <CardContent>
                            <AuthButton onClick={handleAuth}>
                                Авторизоваться через Twitch
                            </AuthButton>
                        </CardContent>
                    </AuthCard>
                )}

                {/* Loading state */}
                {status === 'loading' && (
                    <AuthCard>
                        <CardContent>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Spinner />
                                <StatusText>Инициализация...</StatusText>
                            </div>
                        </CardContent>
                    </AuthCard>
                )}

                {/* Code ready / Polling states */}
                {isWaitingForAuth && (
                    <AuthCard>
                        <CardHeader>
                            <StatusText style={{ color: '#ccc' }}>
                                Выполните авторизацию в Twitch
                            </StatusText>
                        </CardHeader>
                        <CardContent>
                            <ViewModeSection>
                                <RadioGroup
                                    title="Способ авторизации"
                                    defaultSelected={viewMode}
                                    items={[
                                        { key: 'code', text: 'Код и ссылка' },
                                        { key: 'qr', text: 'QR код' }
                                    ]}
                                    direction="horizontal"
                                    itemWidth="140px"
                                    onChange={setViewMode}
                                />
                            </ViewModeSection>

                            {viewMode === 'code' ? (
                                <CodeSection>
                                    <div>
                                        <SectionLabel>Откройте в браузере</SectionLabel>
                                        <Link
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                openExternalLink(authData.verificationUri);
                                            }}
                                        >
                                            {authData.verificationUri}
                                        </Link>
                                    </div>

                                    <div>
                                        <SectionLabel>Введите код</SectionLabel>
                                        <CodeBox>
                                            <Code>{authData.userCode}</Code>
                                        </CodeBox>
                                    </div>
                                </CodeSection>
                            ) : (
                                <QRSection>
                                    <QRContainer>
                                        <QRCodeSVG
                                            value={getFullAuthUrl()}
                                            size={200}
                                            level="M"
                                            includeMargin={false}
                                        />
                                    </QRContainer>
                                    <QRHint>
                                        Отсканируйте QR код с мобильного устройства.
                                        Камера откроет страницу авторизации с уже введенным кодом.
                                    </QRHint>
                                </QRSection>
                            )}

                            {status === 'polling' && (
                                <PollingInfo>
                                    <Spinner />
                                    Ожидание авторизации (попытка {authData.attempt})
                                </PollingInfo>
                            )}

                            <CancelButton onClick={handleCancel}>
                                Отменить
                            </CancelButton>
                        </CardContent>
                    </AuthCard>
                )}

                {/* Success state */}
                {status === 'success' && (
                    <AuthCard>
                        <CardContent>
                            <SuccessBox>
                                ✅ Успешная авторизация!
                            </SuccessBox>
                            <StatusText>Переход в панель управления...</StatusText>
                        </CardContent>
                    </AuthCard>
                )}

                {/* Error state */}
                {status === 'error' && (
                    <AuthCard>
                        <CardContent>
                            <ErrorBox>
                                <strong>Ошибка авторизации</strong>
                                <div>{authData.error}</div>
                            </ErrorBox>
                            <AuthButton onClick={handleAuth}>
                                Попробовать снова
                            </AuthButton>
                        </CardContent>
                    </AuthCard>
                )}
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