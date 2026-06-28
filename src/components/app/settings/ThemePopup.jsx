// components/popups/ThemePopup.js
import React, { useRef } from 'react';
import styled from 'styled-components';
import { tokens } from "../../../designSystem/tokens";
import { Button, ModalHeader, ModalTitle, ModalBody, ModalClose } from "../../../designSystem";
import { useTranslation } from 'react-i18next';
import Popup from '../../utils/PopupComponent';
import { FiDownload, FiUpload, FiTrash2, FiPlus, FiCheck } from 'react-icons/fi';

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
        background: ${tokens.color.bg.raised};
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
    border-radius: ${tokens.radius.xl};
    background: ${({ selected }) => (selected ? 'linear-gradient(135deg, #646cff20, #7c3aed20)' : '#2e2e2e')};
    border: ${({ selected }) => (selected ? `1px solid ${tokens.color.accent.primary}` : `1px solid ${tokens.color.border.default}`)};
    transition: ${tokens.transition.base};
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
    transition: ${tokens.transition.base};
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
    transition: ${tokens.transition.base};

    ${ThemeItem}:hover & {
        opacity: 1;
        transform: translateX(0);
    }
`;

const ActionButton = styled.button`
    border: none;
    padding: 8px;
    background: ${tokens.color.border.default};
    color: #d6d6d6;
    border-radius: ${tokens.radius.lg};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: ${tokens.transition.base};

    &:hover {
        background: ${tokens.color.border.strong};
        color: ${tokens.color.text.primary};
        transform: translateY(-1px);
    }

    &.export:hover {
        background: #2563eb;
    }

    &.delete:hover {
        background: ${tokens.color.danger.base};
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const CreateSection = styled.div`
    padding: 20px;
    background: ${tokens.color.bg.raised};
    border-radius: ${tokens.radius.xl};
    border: 1px solid ${tokens.color.border.default};
`;

const CreateHeader = styled.div`
    font-size: 1.1rem;
    font-weight: 600;
    color: ${tokens.color.text.primary};
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
    border: 1px solid ${tokens.color.border.strong};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.bg.surface};
    color: ${tokens.color.text.primary};
    font-size: 1rem;
    transition: ${tokens.transition.base};

    &::placeholder {
        color: ${tokens.color.text.faint};
    }

    &:focus {
        outline: none;
        border-color: ${tokens.color.accent.primary};
        background: #252525;
    }
`;

const BottomActions = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid ${tokens.color.border.default};
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
        <Popup onClose={onClose} minWidth="480px" maxWidth="600px">
            <ModalHeader $feature="general">
                <ModalTitle $feature="general">{t('settings.themePopup.title')}</ModalTitle>
                <ModalClose onClick={onClose} />
            </ModalHeader>
            <ModalBody>
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
                        <Button $variant="primary" onClick={handleCreateTheme}>
                            <FiPlus />
                            {t('settings.themePopup.create.button')}
                        </Button>
                    </CreateForm>
                </CreateSection>

                <BottomActions>
                    <Button $variant="secondary" onClick={triggerImport}>
                        <FiUpload />
                        {t('settings.themePopup.import')}
                    </Button>
                    <HiddenFileInput
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                    />
                </BottomActions>
            </ModalBody>
        </Popup>
    );
}