import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import Popup from '../../utils/PopupComponent';
import { FiDownload, FiUpload, FiTrash2, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { getBots, updateBot, getCurrentBot, setCurrentBot, deleteBot, selectBot, getByName } from '../../../services/botsApi';

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

const BotsTitle = styled.h2`
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

const BotsList = styled.div`
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

const BotItem = styled.div`
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

const BotIcon = styled.div`
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

const BotName = styled.div`
    flex: 1;
    font-size: 1.1rem;
    font-weight: 500;
    color: ${({ selected }) => (selected ? '#fff' : '#d6d6d6')};
    transition: color 0.2s ease;
`;

const BotActions = styled.div`
    display: flex;
    gap: 6px;
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.2s ease;

    ${BotItem}:hover & {
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

const NewBotInput = styled.input`
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

export default function BotConfigPopup({
                                           onClose,
                                           onBotChange
                                       }) {
    const [bots, setBots] = useState({});
    const [currentBot, setCurrentBotState] = useState(null);
    const [loading, setLoading] = useState(true);
    const botNameRef = useRef(null);
    const fileInputRef = useRef(null);

    // Загрузка данных при монтировании
    useEffect(() => {
        loadBots();
    }, []);

    const loadBots = async () => {
        try {
            setLoading(true);
            const [botsData, currentBotData] = await Promise.all([
                getBots(),
                getCurrentBot()
            ]);
            setBots(botsData);
            setCurrentBotState(currentBotData.name);
        } catch (error) {
            console.error('Ошибка загрузки ботов:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBot = async (botName) => {
        try {
            await selectBot(botName);
            setCurrentBotState(botName);
            onBotChange && onBotChange(botName);
        } catch (error) {
            console.error('Ошибка выбора бота:', error);
        }
    };

    const handleDeleteBot = async (botName) => {
        const botKeys = Object.keys(bots);

        // Запрещаем удаление если бот единственный
        if (botKeys.length <= 1) {
            alert('Нельзя удалить единственного бота!');
            return;
        }

        if (botName === 'default') {
            alert('Нельзя удалить бота по умолчанию!');
            return;
        }

        if (window.confirm(`Вы уверены, что хотите удалить бота "${botName}"?`)) {
            try {
                const result = await deleteBot(botName);
                if (result) {
                    const remainingBots = botKeys.filter(key => key !== botName);
                    const nextBot = remainingBots[0];
                    await selectBot(nextBot);
                    await loadBots();
                    onBotChange && onBotChange(nextBot);
                } else {
                    alert('Бот не найден или не может быть удален');
                }
            } catch (error) {
                console.error('Ошибка удаления бота:', error);
                if (error.message.includes('Cannot delete the default bot')) {
                    alert('Нельзя удалить бота по умолчанию!');
                } else {
                    alert('Произошла ошибка при удалении бота');
                }
            }
        }
    };

    const handleExportBot = async (botName) => {
        try {
            const botConfig = await getByName(botName);
            const exportData = { [botName]: botConfig };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bot_${botName}.json`;
            link.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Ошибка экспорта бота:', error);
        }
    };

    const handleCreateBot = async () => {
        const newBotName = botNameRef.current?.value.trim();
        if (newBotName) {
            try {
                botNameRef.current.value = '';
                await setCurrentBot(newBotName);
                await loadBots();
                onBotChange && onBotChange(newBotName);
            } catch (error) {
                console.error('Ошибка создания бота:', error);
                // Показываем ошибку пользователю если бот уже существует
                if (error.message.includes('already exists')) {
                    alert(`Бот с именем "${newBotName}" уже существует!`);
                } else {
                    alert('Произошла ошибка при создании бота');
                }
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleCreateBot();
        }
    };

    const triggerImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const data = JSON.parse(reader.result);
                const [name, config] = Object.entries(data)[0] || [];
                if (name && config) {
                    // Проверяем структуру конфига
                    if (config.roulette && config.custom && config.pingpong) {
                        await updateBot(name, config);
                        await loadBots(); // Перезагружаем список
                        alert(`Бот "${name}" успешно импортирован!`);
                    } else {
                        alert('Неверный формат файла конфигурации бота');
                    }
                } else {
                    alert('Файл не содержит корректных данных бота');
                }
            } catch (error) {
                console.error('Ошибка импорта бота:', error);
                alert('Ошибка при импорте файла. Проверьте формат файла.');
            }
        };
        reader.readAsText(file);

        // Сброс значения, чтобы можно было импортировать тот же файл повторно
        e.target.value = '';
    };

    if (loading) {
        return (
            <Popup onClose={onClose}>
                <PopupContent>
                    <div style={{ textAlign: 'center', color: '#fff', padding: '40px' }}>
                        Загрузка...
                    </div>
                </PopupContent>
            </Popup>
        );
    }

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <BotsTitle>Управление ботами</BotsTitle>
                    <CloseButton onClick={onClose}>
                        <FiX />
                    </CloseButton>
                </Header>

                <BotsList>
                    {Object.keys(bots).map((key) => (
                        <BotItem
                            key={key}
                            selected={key === currentBot}
                            onClick={() => handleSelectBot(key)}
                        >
                            <BotIcon selected={key === currentBot}>
                                <FiCheck />
                            </BotIcon>
                            <BotName selected={key === currentBot}>
                                {key}
                            </BotName>
                            {key === currentBot && (
                                <BotActions>
                                    <ActionButton
                                        className="export"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportBot(key);
                                        }}
                                        title="Экспортировать бота"
                                    >
                                        <FiDownload />
                                    </ActionButton>
                                    <ActionButton
                                        className="delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteBot(key);
                                        }}
                                        title="Удалить бота"
                                    >
                                        <FiTrash2 />
                                    </ActionButton>
                                </BotActions>
                            )}
                        </BotItem>
                    ))}
                </BotsList>

                <CreateSection>
                    <CreateHeader>Создать нового бота</CreateHeader>
                    <CreateForm>
                        <NewBotInput
                            ref={botNameRef}
                            placeholder="Введите название бота..."
                            onKeyPress={handleKeyPress}
                        />
                        <CreateButton onClick={handleCreateBot}>
                            <FiPlus />
                            Создать
                        </CreateButton>
                    </CreateForm>
                </CreateSection>

                <BottomActions>
                    <ImportButton onClick={triggerImport}>
                        <FiUpload />
                        Импортировать бота
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