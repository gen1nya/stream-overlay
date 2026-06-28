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
    openExternalLink,
    getAvailableLocales,
    getCurrentLocale,
    setLocale
} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { tokens } from "../../designSystem/tokens";
import RadioGroup from "../utils/TextRadioGroup";
import { useTranslation } from 'react-i18next';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 100px);
    text-align: center;
    padding: ${tokens.space.xl};
    position: relative;
    width: 100%;
    box-sizing: border-box;
    background: ${tokens.color.bg.base};
`;

const Title = styled.h2`
    font-size: ${tokens.font.size.xxl};
    font-weight: ${tokens.font.weight.semibold};
    color: #d6d6d6;
    margin-bottom: ${tokens.space.xxxl};
`;

const LanguageSelectorWrapper = styled.div`
    position: absolute;
    top: 20px;
    right: 24px;
    display: flex;
    justify-content: flex-end;
    max-width: 320px;
`;

const AuthCard = styled.div`
    width: calc(100% - ${tokens.space.xxl});
    max-width: 520px;
    background: ${tokens.gradient.surface};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.xxl};
    padding: 0;
    display: flex;
    flex-direction: column;
    box-shadow: ${tokens.shadow.md}, ${tokens.shadow.glow};
    transition: ${tokens.transition.slow};
    overflow: hidden;
`;

const CardHeader = styled.div`
    padding: ${tokens.space.xl} ${tokens.space.xxl} ${tokens.space.lg};
    background: ${tokens.gradient.raised};
    border-bottom: 1px solid ${tokens.color.border.default};
`;

const CardContent = styled.div`
    padding: ${tokens.space.xxl};
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.xl};
`;

const AuthButton = styled.button`
    padding: ${tokens.space.md} ${tokens.space.xxxl};
    font-size: ${tokens.font.size.base};
    font-weight: ${tokens.font.weight.medium};
    background: ${tokens.color.accent.primary};
    border: 1px solid ${tokens.color.accent.primary};
    color: white;
    border-radius: ${tokens.radius.lg};
    cursor: pointer;
    transition: ${tokens.transition.base};

    &:hover {
        background: ${tokens.color.accent.primaryHover};
        border-color: ${tokens.color.accent.primaryHover};
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }

    &:disabled {
        background: ${tokens.color.bg.raisedAlt};
        border-color: ${tokens.color.border.default};
        cursor: not-allowed;
        transform: none;
        opacity: 0.5;
    }
`;

const CancelButton = styled(AuthButton)`
    background: ${tokens.color.bg.raised};
    border-color: ${tokens.color.border.default};

    &:hover {
        background: ${tokens.color.bg.raisedAlt};
        border-color: ${tokens.color.border.strong};
    }
`;

const StatusText = styled.p`
    font-size: ${tokens.font.size.base};
    color: ${tokens.color.text.faint};
    margin: 0;
    line-height: 1.6;
`;

const CodeSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.lg};
`;

const SectionLabel = styled.div`
    font-size: ${tokens.font.size.sm};
    color: ${tokens.color.text.faint};
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: ${tokens.font.weight.medium};
    text-align: left;
`;

const CodeBox = styled.div`
    background: ${tokens.color.bg.app};
    border: 2px solid ${tokens.color.accent.primary};
    border-radius: ${tokens.radius.lg};
    padding: ${tokens.space.xl};
`;

const Code = styled.div`
    font-size: 36px;
    font-weight: bold;
    color: ${tokens.color.accent.primary};
    letter-spacing: 8px;
    font-family: 'Courier New', monospace;
    user-select: all;
`;

const Link = styled.a`
    color: ${tokens.color.accent.primary};
    text-decoration: none;
    font-size: ${tokens.font.size.base};
    word-break: break-all;
    padding: ${tokens.space.md} ${tokens.space.lg};
    background: ${tokens.color.bg.app};
    border-radius: ${tokens.radius.lg};
    border: 1px solid ${tokens.color.border.subtle};
    transition: ${tokens.transition.base};
    display: block;

    &:hover {
        background: ${tokens.color.bg.base};
        border-color: ${tokens.color.accent.primary};
        text-decoration: underline;
    }
`;

const QRSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${tokens.space.lg};
`;

const QRContainer = styled.div`
    background: white;
    padding: ${tokens.space.lg};
    border-radius: ${tokens.radius.xl};
    display: inline-block;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const QRHint = styled.div`
    font-size: 12px;
    color: ${tokens.color.text.faint};
    text-align: center;
    line-height: ${tokens.font.lineHeight.base};
    max-width: 320px;
`;

const spin = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 3px solid ${tokens.color.border.subtle};
    border-top-color: ${tokens.color.accent.primary};
    border-radius: ${tokens.radius.circle};
    animation: ${spin} 0.8s linear infinite;
    display: inline-block;
    margin-right: ${tokens.space.sm};
    vertical-align: middle;
`;

const PollingInfo = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${tokens.space.md} ${tokens.space.lg};
    background: ${tokens.color.scrim.panel};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.lg};
    color: ${tokens.color.text.faint};
    font-size: ${tokens.font.size.base};
`;

const ErrorBox = styled.div`
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: ${tokens.radius.lg};
    padding: ${tokens.space.lg};
    color: ${tokens.color.danger.base};
    text-align: left;

    strong {
        display: block;
        margin-bottom: ${tokens.space.sm};
        font-size: ${tokens.font.size.base};
    }

    div {
        font-size: 13px;
        color: #ef4444;
    }
`;

const SuccessBox = styled.div`
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: ${tokens.radius.lg};
    padding: ${tokens.space.lg};
    color: ${tokens.color.success.base};
    font-size: 16px;
    font-weight: ${tokens.font.weight.medium};
`;

const Footer = styled.footer`
    position: fixed;
    bottom: 0;
    width: 100%;
    background: #100b23;
    padding: 10px 0;
    display: flex;
    justify-content: center;
    gap: ${tokens.space.lg};
    border-top: 1px solid ${tokens.color.border.subtle};
`;

const FooterButton = styled.button`
    box-sizing: border-box;
    height: 40px;
    padding: 0 ${tokens.space.lg};
    font-size: ${tokens.font.size.base};
    color: ${tokens.color.text.primary};
    background: ${tokens.color.bg.surface};
    border: 1px solid transparent;
    border-radius: ${tokens.radius.md};
    cursor: pointer;
    white-space: nowrap;
    width: fit-content;
    flex: 0 0 auto;
    transition: ${tokens.transition.base};

    &:hover {
        background: #232323;
        border: 1px solid ${tokens.color.accent.primary};
    }
`;

const ViewModeSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.md};
    align-items: stretch;
`;

export default function AuthScreen() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [status, setStatus] = useState('idle');
    const [authData, setAuthData] = useState({
        userCode: '',
        verificationUri: '',
        attempt: 0,
        error: '',
        errorMessageKey: null
    });
    const [viewMode, setViewMode] = useState('code');
    const [locales, setLocales] = useState([]);
    const [currentLocale, setCurrentLocale] = useState(i18n.language);

    useEffect(() => {
        let active = true;

        const loadLocales = async () => {
            try {
                const available = await getAvailableLocales();
                if (!active) {
                    return;
                }
                setLocales(Array.isArray(available) ? available : []);
                const storedLocale = await getCurrentLocale();
                if (!active) {
                    return;
                }
                const nextLocale = storedLocale || i18n.language;
                setCurrentLocale(nextLocale);
                if (nextLocale && nextLocale !== i18n.language) {
                    await i18n.changeLanguage(nextLocale);
                }
            } catch (error) {
                console.error('Failed to load locales', error);
            }
        };

        loadLocales();

        return () => {
            active = false;
        };
    }, [i18n]);

    useEffect(() => {
        onAuthCodeReady((data) => {
            console.log('🔑 Auth code ready:', data);
            setStatus('code-ready');
            setAuthData(prev => ({
                ...prev,
                userCode: data.userCode,
                verificationUri: data.verificationUri,
                error: '',
                errorMessageKey: null
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
            setAuthData(prev => ({
                ...prev,
                error: data.message || '',
                errorMessageKey: data.message ? null : 'auth.startError'
            }));
        });

        onAuthCancelled(() => {
            console.log('🚫 Auth cancelled');
            setStatus('idle');
            setAuthData({ userCode: '', verificationUri: '', attempt: 0, error: '', errorMessageKey: null });
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
            setAuthData(prev => ({
                ...prev,
                error: '',
                errorMessageKey: 'auth.startError'
            }));
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

    const handleLocaleChange = async (localeCode) => {
        if (!localeCode || localeCode === currentLocale) {
            return;
        }

        const previousLocale = currentLocale;
        setCurrentLocale(localeCode);

        try {
            await setLocale(localeCode);
            await i18n.changeLanguage(localeCode);
        } catch (error) {
            console.error('Failed to set locale', error);
            setCurrentLocale(previousLocale);
            await i18n.changeLanguage(previousLocale);
        }
    };

    const getFullAuthUrl = () => {
        if (!authData.verificationUri || !authData.userCode) return '';
        return `${authData.verificationUri}?user_code=${authData.userCode}`;
    };

    const isWaitingForAuth = status === 'code-ready' || status === 'polling';
    const errorMessage = authData.errorMessageKey ? t(authData.errorMessageKey) : authData.error;

    return (
        <>
            <Container>
                {locales.length > 0 && (
                    <LanguageSelectorWrapper>
                        <RadioGroup
                            title={t('auth.language')}
                            items={locales.map((locale) => ({
                                key: locale.code,
                                text: locale.name
                            }))}
                            defaultSelected={currentLocale}
                            onChange={handleLocaleChange}
                            direction="horizontal"
                            itemWidth="120px"
                        />
                    </LanguageSelectorWrapper>
                )}

                <Title>{t('auth.title')}</Title>
                {/* Idle state */}
                {status === 'idle' && (
                    <AuthCard>
                        <CardHeader>
                            <StatusText style={{ color: '#ccc' }}>
                                {t('auth.idle.message')}
                            </StatusText>
                        </CardHeader>
                        <CardContent>
                            <AuthButton onClick={handleAuth}>
                                {t('auth.idle.button')}
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
                                <StatusText>{t('auth.loading')}</StatusText>
                            </div>
                        </CardContent>
                    </AuthCard>
                )}

                {/* Code ready / Polling states */}
                {isWaitingForAuth && (
                    <AuthCard>
                        <CardHeader>
                            <StatusText style={{ color: '#ccc' }}>
                                {t('auth.prompt')}
                            </StatusText>
                        </CardHeader>
                        <CardContent>
                            <ViewModeSection>
                                <RadioGroup
                                    title={t('auth.methodTitle')}
                                    defaultSelected={viewMode}
                                    items={[
                                        { key: 'code', text: t('auth.methodCode') },
                                        { key: 'qr', text: t('auth.methodQr') }
                                    ]}
                                    direction="horizontal"
                                    itemWidth="140px"
                                    onChange={setViewMode}
                                />
                            </ViewModeSection>

                            {viewMode === 'code' ? (
                                <CodeSection>
                                    <div>
                                        <SectionLabel>{t('auth.openBrowser')}</SectionLabel>
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
                                        <SectionLabel>{t('auth.enterCode')}</SectionLabel>
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
                                        {t('auth.qrHint')}
                                    </QRHint>
                                </QRSection>
                            )}

                            {status === 'polling' && (
                                <PollingInfo>
                                    <Spinner />
                                    {t('auth.waiting', { count: authData.attempt })}
                                </PollingInfo>
                            )}

                            <CancelButton onClick={handleCancel}>
                                {t('auth.cancel')}
                            </CancelButton>
                        </CardContent>
                    </AuthCard>
                )}

                {/* Success state */}
                {status === 'success' && (
                    <AuthCard>
                        <CardContent>
                            <SuccessBox>
                                {t('auth.successTitle')}
                            </SuccessBox>
                            <StatusText>{t('auth.successSubtitle')}</StatusText>
                        </CardContent>
                    </AuthCard>
                )}

                {/* Error state */}
                {status === 'error' && (
                    <AuthCard>
                        <CardContent>
                            <ErrorBox>
                                <strong>{t('auth.errorTitle')}</strong>
                                <div>{errorMessage}</div>
                            </ErrorBox>
                            <AuthButton onClick={handleAuth}>
                                {t('auth.retry')}
                            </AuthButton>
                        </CardContent>
                    </AuthCard>
                )}
            </Container>

            <Footer>
                <FooterButton onClick={handlerOpenSettings}>{t('footer.settings')}</FooterButton>
                <FooterButton onClick={openPlayer2}>{t('footer.player2')}</FooterButton>
                <FooterButton onClick={openPlayer1}>{t('footer.player1')}</FooterButton>
                <FooterButton onClick={openDemoFFTColumns}>{t('footer.demoColumns')}</FooterButton>
                <FooterButton onClick={openDemoFFTRing}>{t('footer.demoRing')}</FooterButton>
            </Footer>
        </>
    );
}