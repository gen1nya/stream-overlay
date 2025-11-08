import React, { useState, useRef } from 'react';
import styled, { keyframes, ThemeProvider } from 'styled-components';
import {
    AiOutlineCloudUpload,
    AiOutlineClose,
    AiOutlineEye,
    AiOutlineEyeInvisible,
    AiOutlineVerticalAlignTop,
    AiOutlineVerticalAlignMiddle,
    AiOutlineVerticalAlignBottom
} from 'react-icons/ai';
import { useTranslation, Trans } from 'react-i18next';
import {getImageUrl, saveImageBuffer} from "../../services/api";

// Темы
const lightTheme = {
    bg: {
        primary: '#ffffff',
        secondary: '#fafafa',
        tertiary: '#f5f5f5',
        accent: '#f0f8ff',
        success: '#f0fff0',
        hover: '#f9f9f9',
        dragActive: '#f0f0ff',
    },
    text: {
        primary: '#1a1a1a',
        secondary: '#666',
        tertiary: '#999',
        accent: '#646cff',
        success: '#4caf50',
        error: '#f44336',
        info: '#1565c0',
    },
    border: {
        primary: '#ddd',
        secondary: '#ccc',
        accent: '#646cff',
        success: '#4caf50',
        info: '#b3d9ff',
    },
    shadow: {
        sm: '0 1px 3px rgba(0,0,0,0.1)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
    }
};

const darkTheme = {
    bg: {
        primary: 'rgba(26,26,26,0)',
        secondary: '#2d2d2d',
        tertiary: '#3a3a3a',
        accent: '#0f1419',
        success: '#1a2e1a',
        hover: '#252525',
        dragActive: '#1a1a2e',
    },
    text: {
        primary: '#ffffff',
        secondary: '#b3b3b3',
        tertiary: '#888',
        accent: '#7c3aed',
        success: '#4ade80',
        error: '#ef4444',
        info: '#3b82f6',
    },
    border: {
        primary: '#404040',
        secondary: '#555',
        accent: '#7c3aed',
        success: '#4ade80',
        info: '#3b82f6',
    },
    shadow: {
        sm: '0 1px 3px rgba(0,0,0,0.3)',
        md: '0 4px 6px rgba(0,0,0,0.3)',
    }
};

// Анимации
const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
    margin-bottom: 24px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
    background: ${props => props.theme.bg.primary};
    transition: background-color 0.3s ease;
`;

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const SectionTitle = styled.h3`
    font-size: 16px;
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0;
    transition: color 0.3s ease;
`;

const AlignmentGroup = styled.div`
    display: flex;
    background: ${props => props.theme.bg.tertiary};
    border-radius: 8px;
    padding: 4px;
    gap: 2px;
    transition: background-color 0.3s ease;
`;

const AlignmentButton = styled.button`
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: ${props => props.active ? props.theme.bg.primary : 'transparent'};
  color: ${props => props.active ? props.theme.text.accent : props.theme.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${props => props.active ? props.theme.shadow.sm : 'none'};

  &:hover {
    color: ${props => props.active ? props.theme.text.accent : props.theme.text.primary};
    background: ${props => props.active ? props.theme.bg.primary : props.theme.bg.hover};
  }

  svg {
    font-size: 16px;
  }
`;

const UploadArea = styled.div`
  position: relative;
  border: 2px dashed ${props =>
    props.dragActive ? props.theme.border.accent :
        props.hasValue ? props.theme.border.success :
            props.theme.border.primary
};
  border-radius: 12px;
  background: ${props =>
    props.dragActive ? props.theme.bg.dragActive :
        props.hasValue ? props.theme.bg.success :
            props.theme.bg.secondary
};
  transition: all 0.3s ease;
  cursor: ${props => props.hasValue ? 'default' : 'pointer'};

  &:hover {
    border-color: ${props =>
    props.dragActive ? props.theme.border.accent :
        props.hasValue ? props.theme.border.success :
            props.theme.border.secondary
};
    background: ${props =>
    props.hasValue ? props.theme.bg.success : props.theme.bg.hover
};
  }
`;

const UploadContent = styled.div`
    padding: 24px;
    text-align: center;
`;

const LoadedContent = styled.div`
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const LoadedInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const LoadedIcon = styled.div`
    width: 48px;
    height: 48px;
    background: ${props => props.theme.bg.success};
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.text.success};
    transition: all 0.3s ease;

    svg {
        font-size: 20px;
    }
`;

const LoadedDetails = styled.div`
    text-align: left;
`;

const LoadedTitle = styled.p`
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0 0 4px 0;
    font-size: 14px;
    transition: color 0.3s ease;
`;

const LoadedSubtitle = styled.p`
    color: ${props => props.theme.text.secondary};
    margin: 0;
    font-size: 12px;
    transition: color 0.3s ease;
`;

const ActionButtons = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ActionButton = styled.button`
    padding: 8px;
    border: none;
    background: transparent;
    color: ${props => props.variant === 'delete' ? props.theme.text.error : props.theme.text.secondary};
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.variant === 'delete' ?
                (props.theme === darkTheme ? '#2d1b1b' : '#ffebee') :
                props.theme.bg.hover
        };
        color: ${props => props.variant === 'delete' ? props.theme.text.error : props.theme.text.primary};
    }

    svg {
        font-size: 18px;
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
`;

const LoadingState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
`;

const UploadIcon = styled.div`
    width: 48px;
    height: 48px;
    background: ${props => props.theme.bg.tertiary};
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.text.tertiary};
    transition: all 0.3s ease;

    svg {
        font-size: 20px;
    }
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 2px solid ${props => props.theme.bg.tertiary};
    border-top: 2px solid ${props => props.theme.text.accent};
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
`;

const UploadTitle = styled.p`
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0;
    font-size: 14px;
    transition: color 0.3s ease;
`;

const UploadDescription = styled.p`
    color: ${props => props.theme.text.secondary};
    margin: 0;
    font-size: 12px;
    transition: color 0.3s ease;
`;

const UploadLink = styled.button`
    background: none;
    border: none;
    color: ${props => props.theme.text.accent};
    text-decoration: underline;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    transition: color 0.2s ease;

    &:hover {
        color: ${props => props.theme.text.accent};
        opacity: 0.8;
    }
`;

const HiddenInput = styled.input`
    display: none;
`;

const UrlInput = styled.input`
  width: calc(100% - 12px);
  padding: 12px 6px;
  border: 1px solid ${props => props.theme.border.primary};
  border-radius: 8px;
  font-size: 14px;
  color: ${props => props.theme.text.primary};
  background: ${props => props.theme.bg.primary};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.border.accent};
    box-shadow: 0 0 0 3px ${props => props.theme.text.accent}20;
  }

  &::placeholder {
    color: ${props => props.theme.text.tertiary};
  }
`;

const PreviewContainer = styled.div`
    margin-top: 12px;
    padding: 12px;
    background: ${props => props.theme.bg.secondary};
    border-radius: 8px;
    animation: ${fadeIn} 0.3s ease;
    transition: background-color 0.3s ease;
`;

const PreviewImage = styled.img`
  max-width: 100%;
  height: 128px;
  object-fit: contain;
  margin: 0 auto;
  display: block;
  border-radius: 6px;
`;

const PreviewError = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${props => props.theme.text.error};
  margin-top: 8px;
  display: none;
  transition: color 0.3s ease;
`;

const TipsPanel = styled.div`
  background: ${props => props.theme.bg.accent};
  border: 1px solid ${props => props.theme.border.info};
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
`;

const TipsTitle = styled.h4`
  font-weight: 600;
  color: ${props => props.theme.text.info};
  margin: 0 0 8px 0;
  font-size: 14px;
  transition: color 0.3s ease;
`;

const TipsList = styled.ul`
  margin: 0;
  padding-left: 16px;
  color: ${props => props.theme.text.info};
  font-size: 12px;
  transition: color 0.3s ease;

  li {
    margin-bottom: 4px;
  }
`;

const ThemeToggle = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  padding: 8px;
  border: 1px solid ${props => props.theme.border.primary};
  border-radius: 6px;
  background: ${props => props.theme.bg.secondary};
  color: ${props => props.theme.text.primary};
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.bg.hover};
  }
`;

// Компонент для загрузки изображений
export function ImageUploadField({
                              label,
                              value,
                              onChange,
                              onClear,
                              showPreview = true,
                              alignment,
                              onAlignmentChange
                          }) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [showPreviewImage, setShowPreviewImage] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        setIsLoading(true);
        try {
            const reader = new FileReader();

            reader.onload = async () => {
                try {
                    const arrayBuffer = reader.result;
                    const storedFilePath = await saveImageBuffer(file.name, arrayBuffer);
                    const storedFileUrl = await getImageUrl(file.name);

                    // Проверяем, что изображение корректно загружается
                    const img = new Image();
                    img.src = storedFileUrl;

                    img.onload = () => {
                        // Передаем URL загруженного файла в onChange
                        onChange(storedFileUrl);
                        setIsLoading(false);
                    };

                    img.onerror = () => {
                        console.error('Could not load image from server');
                        setIsLoading(false);
                    };
                } catch (serverError) {
                    console.error('Error saving file to server:', serverError);
                    setIsLoading(false);
                }
            };

            reader.onerror = () => {
                console.error('Failed to read file');
                setIsLoading(false);
            };

            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Error uploading file:', error);
            setIsLoading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => {
        setDragActive(false);
    };

    const alignmentOptions = [
        { key: 'top', icon: AiOutlineVerticalAlignTop, label: t('settings.backgroundImage.alignment.top') },
        { key: 'center', icon: AiOutlineVerticalAlignMiddle, label: t('settings.backgroundImage.alignment.center') },
        { key: 'bottom', icon: AiOutlineVerticalAlignBottom, label: t('settings.backgroundImage.alignment.bottom') }
    ];

    return (
        <SectionContainer>
            <SectionHeader>
                <SectionTitle>{label}</SectionTitle>
                {alignment !== undefined && (
                    <AlignmentGroup>
                        {alignmentOptions.map(({ key, icon: Icon, label: optionLabel }) => (
                            <AlignmentButton
                                key={key}
                                active={alignment === key}
                                onClick={() => onAlignmentChange?.(key)}
                                title={optionLabel}
                            >
                                <Icon />
                            </AlignmentButton>
                        ))}
                    </AlignmentGroup>
                )}
            </SectionHeader>

            <UploadArea
                dragActive={dragActive}
                hasValue={!!value}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {value ? (
                    <LoadedContent>
                        <LoadedInfo>
                            <LoadedIcon>
                                <AiOutlineEye />
                            </LoadedIcon>
                            <LoadedDetails>
                                <LoadedTitle>{t('settings.backgroundImage.state.loaded')}</LoadedTitle>
                                <LoadedSubtitle>
                                    {value.startsWith('http')
                                        ? t('settings.backgroundImage.state.fromUrl')
                                        : t('settings.backgroundImage.state.fromUpload')}
                                </LoadedSubtitle>
                            </LoadedDetails>
                        </LoadedInfo>
                        <ActionButtons>
                            {showPreview && (
                                <ActionButton
                                    onClick={() => setShowPreviewImage(!showPreviewImage)}
                                    title={showPreviewImage
                                        ? t('settings.backgroundImage.actions.hidePreview')
                                        : t('settings.backgroundImage.actions.showPreview')}
                                >
                                    {showPreviewImage ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                                </ActionButton>
                            )}
                            <ActionButton
                                variant="delete"
                                onClick={() => onClear?.()}
                                title={t('settings.backgroundImage.actions.remove')}
                            >
                                <AiOutlineClose />
                            </ActionButton>
                        </ActionButtons>
                    </LoadedContent>
                ) : (
                    <UploadContent>
                        {isLoading ? (
                            <LoadingState>
                                <Spinner />
                                <UploadDescription>{t('settings.backgroundImage.state.uploading')}</UploadDescription>
                            </LoadingState>
                        ) : (
                            <EmptyState>
                                <UploadIcon>
                                    <AiOutlineCloudUpload />
                                </UploadIcon>
                                <div>
                                    <UploadTitle>{t('settings.backgroundImage.actions.add')}</UploadTitle>
                                    <UploadDescription>
                                        <Trans
                                            i18nKey="settings.backgroundImage.actions.dragOrSelect"
                                            components={{
                                                link: (
                                                    <UploadLink onClick={() => fileInputRef.current?.click()} />
                                                )
                                            }}
                                        />
                                    </UploadDescription>
                                </div>
                            </EmptyState>
                        )}
                    </UploadContent>
                )}

                <HiddenInput
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
            </UploadArea>

            <UrlInput
                type="url"
                placeholder={t('settings.backgroundImage.actions.pasteUrl')}
                value={typeof value === 'string' && value.startsWith('http') ? value : ''}
                onChange={(e) => onChange(e.target.value)}
            />

            {showPreviewImage && value && (
                <PreviewContainer>
                    <PreviewImage
                        src={value}
                        alt={t('settings.backgroundImage.preview.alt')}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <PreviewError>
                        {t('settings.backgroundImage.preview.error')}
                    </PreviewError>
                </PreviewContainer>
            )}
        </SectionContainer>
    );
}

export default function BackgroundImageEditorComponent({
                                                           message,
                                                           onImageChanged,
                                                           darkMode = true // Пропс для переключения темы
                                                       }) {
    const { t } = useTranslation();
    const [isDark, setIsDark] = useState(darkMode);
    const backgroundImages = message?.backgroundImages || {};
    const currentTheme = isDark ? darkTheme : lightTheme;

    return (
        <ThemeProvider theme={currentTheme}>
            <Container>
                <ImageUploadField
                    label={t('settings.backgroundImage.sections.header')}
                    value={backgroundImages.top}
                    onChange={(value) => onImageChanged({ top: value })}
                    onClear={() => onImageChanged({ top: undefined })}
                />

                <ImageUploadField
                    label={t('settings.backgroundImage.sections.main')}
                    value={backgroundImages.middle}
                    onChange={(value) => onImageChanged({ middle: value })}
                    onClear={() => onImageChanged({ middle: undefined })}
                    alignment={backgroundImages.middleAlign || 'top'}
                    onAlignmentChange={(align) => onImageChanged({ middleAlign: align })}
                />

                <ImageUploadField
                    label={t('settings.backgroundImage.sections.footer')}
                    value={backgroundImages.bottom}
                    onChange={(value) => onImageChanged({ bottom: value })}
                    onClear={() => onImageChanged({ bottom: undefined })}
                />
            </Container>
        </ThemeProvider>
    );
}