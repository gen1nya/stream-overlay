import React from 'react';
import styled from 'styled-components';
import { FiInfo, FiGithub, FiGlobe } from 'react-icons/fi';
import {
    CardContent,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard
} from "./SharedSettingsStyles";
import appicon from "../../../assets/icon.png";
import sora_1 from "../../../assets/sora_silent.png";
import sora_2 from "../../../assets/sora_speak.png";
import {openExternalLink, openTerminal} from "../../../services/api";
import {AiFillTwitch} from "react-icons/ai";

const AboutCardWrapper = styled(SettingsCard)`
    position: relative;
    overflow: hidden;
`;

const BackgroundImage = styled.div`
    position: absolute;
    right: 0;
    bottom: 0;
    width: 300px;
    height: 300px;
    opacity: 0.5;
    background-image: url(${sora_1});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    z-index: 2;

    transition: all 0.2s ease;

    &:hover {
        background-image: url(${sora_2});
    }
    
`;

const ContentWrapper = styled.div`
    position: relative;
    z-index: 1;
`;

const AppIconSection = styled.div`
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;
    padding: 20px;
    background: rgba(30, 30, 30, 0.5);
    border-radius: 8px;
    border: 1px solid #333;
`;

const AppIcon = styled.div`
    width: 80px;
    height: 80px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(98, 62, 131, 0.3);
    background: url(${appicon}) no-repeat center center / cover;
`;

const AppInfo = styled.div`
    flex: 1;
`;

const AppName = styled.h2`
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #fff;
`;

const AppVersion = styled.div`
    color: #999;
    font-size: 14px;
    margin-bottom: 4px;
`;

const AppTagline = styled.div`
    color: #ccc;
    font-size: 13px;
    font-style: italic;
`;

const DescriptionText = styled.p`
    color: #ccc;
    line-height: 1.6;
    margin: 0 0 16px 0;
    font-size: 14px;
`;

const SocialLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
`;

const SocialLink = styled.a`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(30, 30, 30, 0.5);
    border: 0.5px solid #333;
    border-radius: 6px;
    color: #ccc;
    text-decoration: none;
    font-size: 14px;
    transition: all 0.2s ease;
    cursor: pointer;

    svg {
        width: 18px;
        height: 18px;
    }

    &:hover {
        background: linear-gradient(135deg, rgba(100, 108, 255, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%);
        border-color: rgb(133, 83, 242, 0.8);
        color: rgb(133, 83, 242, 0.8);
        transform: translateY(-2px);
    }
`;

const ExternalLink = ({ href, children }) => (
    <SocialLink
        onClick={() => openExternalLink(href)}
        style={{cursor: 'pointer'}}
    >
        {children}
    </SocialLink>
);

const InfoGrid = styled.div`
    display: flex;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;
`;

const InfoItem = styled.div`
    padding: 12px 16px;
    background: rgba(30, 30, 30, 0.3);
    width: 200px;
    border-radius: 6px;
    border-left: 3px solid #543e83;
`;

const InfoLabel = styled.div`
    color: #999;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
`;

const InfoValue = styled.div`
    color: #fff;
    font-size: 14px;
    font-weight: 500;
`;

export default function AboutCard() {
    return (
        <AboutCardWrapper>
            <BackgroundImage />

            <ContentWrapper>
                <CardContent>
                    {/* Иконка и основная информация */}
                    <AppIconSection>
                        <AppIcon/>
                        <AppInfo>
                            <AppName>Оверлеешная</AppName>
                            <AppVersion>Версия 0.6.0-beta</AppVersion>
                            <AppTagline>Собрано 08.10.2025</AppTagline>
                        </AppInfo>
                    </AppIconSection>

                    {/* Описание */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiInfo />
                                Описание
                            </SectionTitle>
                        </SectionHeader>

                        <DescriptionText>
                            Набор виджетов для оверлеев в OBS Studio и других программ. (чат, плееры, счетчик фоловеров)<br/>
                            И еще бот с гачей, рулеткой и простым запрос-ответ
                        </DescriptionText>

                        <DescriptionText>
                            Проект полностью открытый и бесплатный, аналитику не собирает, сервер не требует. <br/>
                            Я буду рад любой помощи - от тестирования и багрепортов до кода и дизайна.
                        </DescriptionText>

                        <DescriptionText>
                            Слеплено при поддержке <span onClick={openTerminal}>NEPTUNE INTELLIGENZA</span>
                        </DescriptionText>

                        <InfoGrid>
                            <InfoItem>
                                <InfoLabel>Лицензия</InfoLabel>
                                <InfoValue>GNU GPL v3 License</InfoValue>
                            </InfoItem>
                            <InfoItem>
                                <InfoLabel>Платформа</InfoLabel>
                                <InfoValue>Windows, Linux (if you brave enough)</InfoValue>
                            </InfoItem>
                        </InfoGrid>
                    </Section>

                    {/* Социальные сети и контакты */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiGlobe />
                                Контакты и социальные сети
                            </SectionTitle>
                        </SectionHeader>

                        <SocialLinks>
                            <ExternalLink href="https://github.com/gen1nya/stream-overlay" target="_blank" rel="noopener noreferrer">
                                <FiGithub />
                                GitHub
                            </ExternalLink>
                            <ExternalLink href="https://www.twitch.tv/evg_on" target="_blank" rel="noopener noreferrer">
                                <AiFillTwitch />
                                Twitch
                            </ExternalLink>
                            <ExternalLink href="https://tools.rus.ebatel.online/" target="_blank" rel="noopener noreferrer">
                                <FiGlobe />
                                Веб-сайт
                            </ExternalLink>
                        </SocialLinks>
                    </Section>
                </CardContent>
            </ContentWrapper>
        </AboutCardWrapper>
    );
}