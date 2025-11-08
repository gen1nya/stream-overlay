import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiGlobe } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import RadioGroup from '../../utils/TextRadioGroup';
import {
    CardContent,
    CardHeader,
    CardSubtitle,
    CardTitle,
    ControlGroup,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
} from './SharedSettingsStyles';
import { getAvailableLocales, getCurrentLocale, setLocale } from '../../../services/api';
import styled from 'styled-components';

const StatusText = styled.span`
    color: #9ca3af;
    font-size: 13px;
`;

const SelectorWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 420px;
`;

const AppearanceSettingsCard = () => {
    const { t, i18n } = useTranslation();
    const [locales, setLocales] = useState([]);
    const [currentLocale, setCurrentLocale] = useState(i18n.language);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasError, setHasError] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        const loadLocales = async () => {
            setIsLoading(true);
            setHasError(false);
            try {
                const available = await getAvailableLocales();
                if (!mountedRef.current) {
                    return;
                }
                setLocales(Array.isArray(available) ? available : []);
                const storedLocale = await getCurrentLocale();
                if (!mountedRef.current) {
                    return;
                }
                const nextLocale = storedLocale || i18n.language;
                setCurrentLocale(nextLocale);
                if (nextLocale && nextLocale !== i18n.language) {
                    await i18n.changeLanguage(nextLocale);
                }
            } catch (error) {
                console.error('Failed to load locales', error);
                if (mountedRef.current) {
                    setHasError(true);
                }
            } finally {
                if (mountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        loadLocales();

        return () => {
            mountedRef.current = false;
        };
    }, [i18n]);

    const handleLocaleChange = async (localeCode) => {
        if (!localeCode || localeCode === currentLocale) {
            return;
        }
        setIsSaving(true);
        setHasError(false);
        const previousLocale = currentLocale;
        setCurrentLocale(localeCode);

        try {
            await setLocale(localeCode);
            await i18n.changeLanguage(localeCode);
        } catch (error) {
            console.error('Failed to set locale', error);
            if (mountedRef.current) {
                setHasError(true);
                setCurrentLocale(previousLocale);
                await i18n.changeLanguage(previousLocale);
            }
        } finally {
            if (mountedRef.current) {
                setIsSaving(false);
            }
        }
    };

    const localeItems = useMemo(() => (
        locales.map((locale) => ({
            key: locale.code,
            text: locale.name,
        }))
    ), [locales]);

    return (
        <SettingsCard>
            <CardHeader>
                <CardTitle>
                    <FiGlobe />
                    {t('settings.general.appearance.title')}
                </CardTitle>
                <CardSubtitle>
                    {t('settings.general.appearance.subtitle')}
                </CardSubtitle>
            </CardHeader>

            <CardContent>
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiGlobe />
                            {t('settings.general.appearance.languageLabel')}
                        </SectionTitle>
                    </SectionHeader>

                    <ControlGroup>
                        <SelectorWrapper>
                            <RadioGroup
                                items={localeItems}
                                defaultSelected={currentLocale}
                                onChange={handleLocaleChange}
                                direction="horizontal"
                            />
                            {isLoading && <StatusText>{t('settings.general.appearance.loading')}</StatusText>}
                            {isSaving && !isLoading && (
                                <StatusText>{t('settings.general.appearance.saving')}</StatusText>
                            )}
                            {hasError && (
                                <StatusText>{t('settings.general.appearance.error')}</StatusText>
                            )}
                        </SelectorWrapper>
                    </ControlGroup>
                </Section>
            </CardContent>
        </SettingsCard>
    );
};

export default AppearanceSettingsCard;
