// components/popups/ThemePopup.js
import React, { useRef } from 'react';
import styled from 'styled-components';
import Popup from '../../utils/PopupComponent';
import {Row} from "../SettingsComponent";

const PopupContent = styled.div`
    display: flex;
    padding: 8px 16px 16px 16px;
    flex-direction: column;
    gap: 8px;
`;

const ThemesTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
    padding: 8px 0;
`;

const ThemeItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 4px;
`;

const ThemeName = styled.div`
    flex-grow: 1;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 4px;
    background: #252525;
    color: #d6d6d6;
    padding: 8px;
    border: ${({ selected }) => (selected ? '1px solid #00ff00' : '1px solid transparent')};
    width: ${({ selected }) => (selected ? 'calc(100% - 72px)' : '100%')};
    transition: width 0.3s ease;
`;

const ThemeActions = styled.div`
    display: flex;
    gap: 4px;
`;

const ActionButton = styled.button`
    border: 1px solid transparent;
    padding: 4px 8px;
    background: #3a3a3a;
    color: #d6d6d6;
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        background: #4a4a4a;
        border-color: #646cff;
    }
`;

const ThemeCreate = styled.div`
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    flex-direction: row;
    height: 48px;
`;

const NewThemeInput = styled.input`
    box-sizing: border-box;
    width: auto;
    flex: 1;
    height: 100%;
    padding: 8px;
    border: 1px solid #444;
    border-radius: 4px;
    background: #2e2e2e;
    color: #d6d6d6;
    margin-right: 8px;
    font-size: 1rem;
    &::placeholder {
        color: #888;
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
    };

    const handleCreateTheme = () => {
        const newThemeName = themeNameRef.current?.value.trim();
        if (newThemeName) {
            onCreateTheme(newThemeName);
        }
    };

    return (
        <Popup>
            <PopupContent>
                <ThemesTitle>Темы</ThemesTitle>
                {Object.keys(themeList).map((key) => (
                    <ThemeItem key={key}>
                        <ThemeName
                            onClick={() => onChangeTheme(key)}
                            selected={key === selectedThemeName}
                        >
                            {key}
                        </ThemeName>
                        {key === selectedThemeName && (
                            <ThemeActions>
                                <ActionButton onClick={() => onExportTheme(key)}>📥</ActionButton>
                                <ActionButton onClick={() => onDeleteTheme(key)}>🗑️</ActionButton>
                            </ThemeActions>
                        )}
                    </ThemeItem>
                ))}

                <ThemeCreate>
                    <NewThemeInput ref={themeNameRef} placeholder="Название темы" />
                    <ActionButton onClick={handleCreateTheme}>+</ActionButton>
                </ThemeCreate>

                <Row justify="space-between">
                    <div>
                        <ActionButton onClick={triggerImport}>Import</ActionButton>
                        <HiddenFileInput ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} />
                    </div>
                    <ActionButton onClick={onClose}>Закрыть</ActionButton>
                </Row>
            </PopupContent>
        </Popup>
    );
}
