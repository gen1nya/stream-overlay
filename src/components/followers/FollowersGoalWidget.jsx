import React, { useState, useEffect } from 'react';
import styled, {css, keyframes} from 'styled-components';
import { ThemeProvider } from 'styled-components';
import useReconnectingWebSocket from '../../hooks/useReconnectingWebSocket';
import { defaultTheme } from '../../theme';
import { registerFontFace } from "../utils/fontsCache";

/* ---------- Анимации ---------- */
const pulse = keyframes`
    0%, 100% {
        box-shadow:
                0 0 8px rgba(155, 116, 255, 0.6),
                0 0 16px rgba(155, 116, 255, 0.4);
        transform: scale(1);
    }
    50% {
        box-shadow:
                0 0 16px rgba(155, 116, 255, 0.8),
                0 0 32px rgba(155, 116, 255, 0.6);
        transform: scale(1.01);
    }
`;

const textPulse = keyframes`
    0%, 100% {
        text-shadow: 
            0 0 4px rgba(255, 255, 255, 0.8),
            0 0 8px rgba(155, 116, 255, 0.6);
    }
    50% {
        text-shadow: 
            0 0 8px rgba(255, 255, 255, 1),
            0 0 16px rgba(155, 116, 255, 0.9);
    }
`;

const progressAnimation = keyframes`
    from {
        width: 0%;
    }
`;

/* ---------- Styled Components ---------- */
const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.followersGoal?.spacing ?? 12}px;
    padding: ${({ theme }) => theme.followersGoal?.padding ?? 16}px;
    background: ${({ theme }) => theme.followersGoal?.backgroundColor ?? 'rgba(0, 0, 0, 0.7)'};
    border-radius: ${({ theme }) => theme.followersGoal?.borderRadius ?? 12}px;
    border: ${({ theme }) => theme.followersGoal?.borderWidth ?? 2}px solid 
            ${({ theme }) => theme.followersGoal?.borderColor ?? 'rgba(155, 116, 255, 0.55)'};
    width: ${({ theme }) => theme.followersGoal?.width ?? 400}px;
    box-sizing: border-box;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Title = styled.div`
    font-family: ${({ theme }) => theme.followersGoal?.titleFont?.family ?? 'Arial, sans-serif'};
    font-size: ${({ theme }) => theme.followersGoal?.titleFont?.size ?? 18}px;
    font-weight: ${({ theme }) => theme.followersGoal?.titleFont?.weight ?? 700};
    color: ${({ theme }) => theme.followersGoal?.titleColor ?? '#fff'};
    text-shadow: ${({ theme }) =>
    theme.followersGoal?.titleGlow
        ? '0 0 8px rgba(155, 116, 255, 0.8)'
        : 'none'
};
`;

const Counter = styled.div`
    font-family: ${({ theme }) => theme.followersGoal?.counterFont?.family ?? 'Arial, sans-serif'};
    font-size: ${({ theme }) => theme.followersGoal?.counterFont?.size ?? 20}px;
    font-weight: ${({ theme }) => theme.followersGoal?.counterFont?.weight ?? 700};
    color: ${({ theme }) => theme.followersGoal?.counterColor ?? '#9b74ff'};
`;

const ProgressBarContainer = styled.div`
    width: 100%;
    height: ${({ theme }) => theme.followersGoal?.barHeight ?? 24}px;
    background: ${({ theme }) => theme.followersGoal?.barBackground ?? 'rgba(255, 255, 255, 0.1)'};
    border-radius: ${({ theme }) => theme.followersGoal?.barBorderRadius ?? 12}px;
    overflow: hidden;
    position: relative;
    border: 1px solid ${({ theme }) => theme.followersGoal?.barBorderColor ?? 'rgba(255, 255, 255, 0.2)'};
`;

const ProgressBarFill = styled.div`
    height: 100%;
    width: ${({ $percentage }) => Math.min($percentage, 100)}%;
    background: ${({ theme, $isComplete }) => {
    if ($isComplete && theme.followersGoal?.completedGradient) {
        return theme.followersGoal.completedGradient;
    }
    return theme.followersGoal?.barGradient || 'linear-gradient(90deg, #9b74ff 0%, #7c4dff 100%)';
}};
    transition: width 0.6s ease-out;
    animation: ${progressAnimation} 0.8s ease-out;
    position: relative;
    box-shadow: ${({ theme }) =>
    theme.followersGoal?.barGlow
        ? '0 0 12px rgba(155, 116, 255, 0.6)'
        : 'none'
};
    
    ${({ $isComplete, theme }) =>
        $isComplete && theme.followersGoal?.animateOnComplete
            ? css`animation: ${pulse} 2s ease-in-out infinite;`
            : ''
}
`;

const PercentageText = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: ${({ theme }) => theme.followersGoal?.percentageFont?.family ?? 'Arial, sans-serif'};
    font-size: ${({ theme }) => theme.followersGoal?.percentageFont?.size ?? 14}px;
    font-weight: ${({ theme }) => theme.followersGoal?.percentageFont?.weight ?? 600};
    color: ${({ theme }) => theme.followersGoal?.percentageColor ?? '#fff'};
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    z-index: 1;
`;

const GoalText = styled.div`
    text-align: center;
    font-family: ${({ theme }) => theme.followersGoal?.goalFont?.family ?? 'Arial, sans-serif'};
    font-size: ${({ theme }) => theme.followersGoal?.goalFont?.size ?? 14}px;
    color: ${({ theme }) => theme.followersGoal?.goalColor ?? 'rgba(255, 255, 255, 0.7)'};
    margin-top: ${({ theme }) => theme.followersGoal?.goalTextMargin ?? 4}px;
`;

const CompletedMessage = styled.div`
    text-align: center;
    font-family: ${({ theme }) => theme.followersGoal?.completedFont?.family ?? 'Arial, sans-serif'};
    font-size: ${({ theme }) => theme.followersGoal?.completedFont?.size ?? 16}px;
    font-weight: ${({ theme }) => theme.followersGoal?.completedFont?.weight ?? 700};
    color: ${({ theme }) => theme.followersGoal?.completedColor ?? '#00ff88'};
    text-shadow: 0 0 12px rgba(0, 255, 136, 0.8);
    animation: ${textPulse} 2s ease-in-out infinite;
`;

/* ---------- Компонент ---------- */
export default function FollowersGoalWidget() {
    const [currentFollowers, setCurrentFollowers] = useState(0);
    const [currentTheme, setCurrentTheme] = useState(defaultTheme);
    const [currentThemeName] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('theme');
    });

    function applyTheme(theme) {
        setCurrentTheme(theme);

        // Регистрируем шрифты если они есть
        const fonts = [
            theme?.followersGoal?.titleFont,
            theme?.followersGoal?.counterFont,
            theme?.followersGoal?.percentageFont,
            theme?.followersGoal?.goalFont,
            theme?.followersGoal?.completedFont
        ];

        fonts.forEach(font => {
            if (font?.family && font?.url) {
                registerFontFace(font.family, font.url);
            }
        });
    }

    function requestTheme(socket, themeName) {
        if (themeName) {
            socket.send(JSON.stringify({
                channel: 'theme:get-by-name',
                payload: { name: themeName }
            }));
        } else {
            socket.send(JSON.stringify({ channel: 'theme:get' }));
        }
    }

    const { isConnected } = useReconnectingWebSocket('ws://localhost:42001', {
        onOpen: (_, socket) => {
            console.log('🟢 WebSocket подключен');
            requestTheme(socket, currentThemeName);
            socket.send(JSON.stringify({
                channel: 'event:get-new-followers-count',
            }));
        },
        onMessage: async (event) => {
            const { channel, payload } = JSON.parse(event.data);
            switch (channel) {
                case 'event:new_followers_count': {
                    setCurrentFollowers(payload || 0);
                    break;
                }
                case 'theme:update-by-name': {
                    const { name, theme } = payload;
                    if (currentThemeName !== name) break;
                    if (!theme) break;
                    console.log('🔵 Theme updated:', name);
                    applyTheme(theme);
                    break;
                }
                case 'theme:update': {
                    if (currentThemeName) break;
                    applyTheme(payload);
                    break;
                }
                default:
                    break;
            }
        },
        onClose: () => {
            console.log('🔴 WebSocket отключен');
        },
    });

    const goalFollowers = currentTheme.followersGoal?.target || 1000;
    const percentage = (currentFollowers / goalFollowers) * 100;
    const isComplete = currentFollowers >= goalFollowers;

    return (
        <ThemeProvider theme={currentTheme}>
            <Container>
                <Header>
                    <Title>
                        {currentTheme.followersGoal?.title || 'Цель по фоловерам'}
                    </Title>
                    {/*<Counter>
                        {currentFollowers.toLocaleString()} / {goalFollowers.toLocaleString()}
                    </Counter>*/}
                </Header>

                <ProgressBarContainer>
                    <ProgressBarFill
                        $percentage={percentage}
                        $isComplete={isComplete}
                    />
                    <PercentageText>
                        {/*{Math.min(Math.round(percentage), 100)}%*/}
                        {currentFollowers.toLocaleString()} / {goalFollowers.toLocaleString()}
                    </PercentageText>
                </ProgressBarContainer>

                {isComplete ? (
                    <CompletedMessage>
                        {currentTheme.followersGoal?.completedMessage || '🎉 Цель достигнута!'}
                    </CompletedMessage>
                ) : (
                    <GoalText>
                        {currentTheme.followersGoal?.goalText ||
                            `Осталось: ${(goalFollowers - currentFollowers).toLocaleString()}`}
                    </GoalText>
                )}
            </Container>
        </ThemeProvider>
    );
}