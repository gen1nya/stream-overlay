import React, { useMemo } from 'react';
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
import hny_sora_1 from "../../../assets/hny_sora_silent.png";
import hny_sora_2 from "../../../assets/hny_sora_speak.png";
import {openExternalLink, openTerminal} from "../../../services/api";
import {AiFillTwitch} from "react-icons/ai";
import { Trans, useTranslation } from "react-i18next";
import { isEventActive } from "../../../utils/seasonalEvents";

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
    background-image: url(${props => props.$silent});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    z-index: 2;

    transition: all 0.2s ease;

    &:hover {
        background-image: url(${props => props.$speak});
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

const APP_VERSION = '0.6.0-beta';
const BUILD_DATE = '08.10.2025';

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
    const { t } = useTranslation();

    const isNewYear = useMemo(() => isEventActive('new_year'), []);
    const silentImage = isNewYear ? hny_sora_1 : sora_1;
    const speakImage = isNewYear ? hny_sora_2 : sora_2;

    return (
        <AboutCardWrapper>
            <BackgroundImage $silent={silentImage} $speak={speakImage} />

            <ContentWrapper>
                <CardContent>
                    {/* Иконка и основная информация */}
                    <AppIconSection>
                        <AppIcon/>
                        <AppInfo>
                            <AppName>{t('settings.about.appName')}</AppName>
                            <AppVersion>{t('settings.about.version', { version: APP_VERSION })}</AppVersion>
                            <AppTagline>{t('settings.about.build', { date: BUILD_DATE })}</AppTagline>
                        </AppInfo>
                    </AppIconSection>

                    {/* Описание */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiInfo />
                                {t('settings.about.description.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <DescriptionText>
                            {t('settings.about.description.paragraph1.line1')}
                            <br/>
                            {t('settings.about.description.paragraph1.line2')}
                        </DescriptionText>

                        <DescriptionText>
                            {t('settings.about.description.paragraph2.line1')}
                            <br/>
                            {t('settings.about.description.paragraph2.line2')}
                        </DescriptionText>

                        <DescriptionText>
                            <Trans
                                i18nKey="settings.about.description.support"
                                components={{ highlight: <span onClick={openTerminal} /> }}
                            />
                        </DescriptionText>

                        <InfoGrid>
                            <InfoItem>
                                <InfoLabel>{t('settings.about.description.license.label')}</InfoLabel>
                                <InfoValue>{t('settings.about.description.license.value')}</InfoValue>
                            </InfoItem>
                            <InfoItem>
                                <InfoLabel>{t('settings.about.description.platform.label')}</InfoLabel>
                                <InfoValue>{t('settings.about.description.platform.value')}</InfoValue>
                            </InfoItem>
                        </InfoGrid>
                    </Section>

                    {/* Социальные сети и контакты */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiGlobe />
                                {t('settings.about.social.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <SocialLinks>
                            <ExternalLink href="https://github.com/gen1nya/stream-overlay" target="_blank" rel="noopener noreferrer">
                                <FiGithub />
                                {t('settings.about.social.github')}
                            </ExternalLink>
                            <ExternalLink href="https://www.twitch.tv/evg_on" target="_blank" rel="noopener noreferrer">
                                <AiFillTwitch />
                                {t('settings.about.social.twitch')}
                            </ExternalLink>
                            <ExternalLink href="https://tools.rus.ebatel.online/" target="_blank" rel="noopener noreferrer">
                                <FiGlobe />
                                {t('settings.about.social.website')}
                            </ExternalLink>
                        </SocialLinks>
                    </Section>
                </CardContent>
            </ContentWrapper>
        </AboutCardWrapper>
    );
}