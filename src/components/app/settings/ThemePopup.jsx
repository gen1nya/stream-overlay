// components/popups/ThemePopup.js
import React, { useRef } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Popup from '../../utils/PopupComponent';
import { FiDownload, FiUpload, FiTrash2, FiPlus, FiX, FiCheck } from 'react-icons/fi';

const PopupContent = styled.div`
    display: flex;
    padding: 24px;
    flex-direction: column;
    gap: 20px;
    min-width: 480px;
    max-width: 600px;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
`;

const ThemesTitle = styled.h2`
    font-size: 1.8rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
    background: linear-gradient(135deg, #646cff, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: #444;
        color: #fff;
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const ThemesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 400px;
    overflow-y: auto;
    padding: 2px 8px 2px 2px;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: #2a2a2a;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #666;
    }
`;

const ThemeItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    background: ${({ selected }) => (selected ? 'linear-gradient(135deg, #646cff20, #7c3aed20)' : '#2e2e2e')};
    border: ${({ selected }) => (selected ? '1px solid #646cff' : '1px solid #444')};
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;

    &:hover {
        background: ${({ selected }) => (selected ? 'linear-gradient(135deg, #646cff30, #7c3aed30)' : '#363636')};
        border-color: ${({ selected }) => (selected ? '#646cff' : '#555')};
        transform: translateY(-1px);
    }
`;

const ThemeIcon = styled.div`
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ selected }) => (selected ? '#646cff' : '#666')};
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 8px;
        height: 8px;
        color: white;
        opacity: ${({ selected }) => (selected ? 1 : 0)};
        transition: opacity 0.2s ease;
    }
`;

const ThemeName = styled.div`
    flex: 1;
    font-size: 1.1rem;
    font-weight: 500;
    color: ${({ selected }) => (selected ? '#fff' : '#d6d6d6')};
    transition: color 0.2s ease;
`;

const ThemeActions = styled.div`
    display: flex;
    gap: 6px;
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.2s ease;

    ${ThemeItem}:hover & {
        opacity: 1;
        transform: translateX(0);
    }
`;

const ActionButton = styled.button`
    border: none;
    padding: 8px;
    background: #444;
    color: #d6d6d6;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: #555;
        color: #fff;
        transform: translateY(-1px);
    }

    &.export:hover {
        background: #2563eb;
    }

    &.delete:hover {
        background: #dc2626;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const CreateSection = styled.div`
    padding: 20px;
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
`;

const CreateHeader = styled.div`
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 12px;
`;

const CreateForm = styled.div`
    display: flex;
    gap: 10px;
    align-items: stretch;
`;

const NewThemeInput = styled.input`
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 1rem;
    transition: all 0.2s ease;

    &::placeholder {
        color: #888;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
`;

const CreateButton = styled(ActionButton)`
    background: #646cff;
    color: white;
    padding: 12px 16px;

    &:hover {
        background: #5a5acf;
        transform: translateY(-1px);
    }
`;

const BottomActions = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #444;
`;

const ImportButton = styled(ActionButton)`
    background: #059669;
    color: white;
    padding: 10px 16px;
    gap: 8px;

    &:hover {
        background: #047857;
    }
`;

const HiddenFileInput = styled.input`
    display: none;
`;

export default function ThemePopup({
                                       onClose,
                                       themeList,
                                       selectedThemeName,
                                       onChangeTheme,
                                       onDeleteTheme,
                                       onExportTheme,
                                       onImportTheme,
                                       onCreateTheme
                                   }) {
    const { t } = useTranslation();
    const themeNameRef = useRef(null);
    const fileInputRef = useRef(null);

    const triggerImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                const [name, theme] = Object.entries(data)[0] || [];
                if (name && theme) {
                    onImportTheme(name, theme);
                }
            } catch (err) {
                console.error('Failed to import theme', err);
            }
        };
        reader.readAsText(file);
        // Сброс значения, чтобы можно было импортировать тот же файл повторно
        e.target.value = '';
    };

    const handleCreateTheme = () => {
        const newThemeName = themeNameRef.current?.value.trim();
        if (newThemeName) {
            onCreateTheme(newThemeName);
            themeNameRef.current.value = '';
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleCreateTheme();
        }
    };

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <ThemesTitle>{t('settings.themePopup.title')}</ThemesTitle>
                    <CloseButton onClick={onClose}>
                        <FiX />
                    </CloseButton>
                </Header>

                <ThemesList>
                    {Object.keys(themeList).map((key) => (
                        <ThemeItem
                            key={key}
                            selected={key === selectedThemeName}
                            onClick={() => onChangeTheme(key)}
                        >
                            <ThemeIcon selected={key === selectedThemeName}>
                                <FiCheck />
                            </ThemeIcon>
                            <ThemeName selected={key === selectedThemeName}>
                                {key}
                            </ThemeName>
                            {key === selectedThemeName && (
                                <ThemeActions>
                                    <ActionButton
                                        className="export"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onExportTheme(key);
                                        }}
                                        title={t('settings.themePopup.actions.export')}
                                    >
                                        <FiDownload />
                                    </ActionButton>
                                    <ActionButton
                                        className="delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteTheme(key);
                                        }}
                                        title={t('settings.themePopup.actions.delete')}
                                    >
                                        <FiTrash2 />
                                    </ActionButton>
                                </ThemeActions>
                            )}
                        </ThemeItem>
                    ))}
                </ThemesList>

                <CreateSection>
                    <CreateHeader>{t('settings.themePopup.create.title')}</CreateHeader>
                    <CreateForm>
                        <NewThemeInput
                            ref={themeNameRef}
                            placeholder={t('settings.themePopup.create.placeholder')}
                            onKeyPress={handleKeyPress}
                        />
                        <CreateButton onClick={handleCreateTheme}>
                            <FiPlus />
                            {t('settings.themePopup.create.button')}
                        </CreateButton>
                    </CreateForm>
                </CreateSection>

                <BottomActions>
                    <ImportButton onClick={triggerImport}>
                        <FiUpload />
                        {t('settings.themePopup.import')}
                    </ImportButton>
                    <HiddenFileInput
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                    />
                </BottomActions>
            </PopupContent>
        </Popup>
    );
}