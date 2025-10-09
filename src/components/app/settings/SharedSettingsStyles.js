import styled from 'styled-components';

// Основная карточка настроек
export const SettingsCard = styled.div`
    width: calc(100% - 24px);
    margin: 12px 12px 0 12px;
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border: 1px solid #333;
    border-radius: 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    box-shadow: 
        0 4px 20px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    overflow: hidden;
    
    &:hover {
        transform: translateY(-1px);
        box-shadow: 
            0 8px 30px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.08);
        border-color: #444;
    }
`;

// Заголовок карточки
export const CardHeader = styled.div`
    padding: 20px 24px 16px;
    background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);
    border-bottom: 1px solid #444;
    display: flex;
    align-items: center;
    gap: 12px;
`;

// Заголовок карточки
export const CardTitle = styled.h3`
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
    
    svg {
        width: 20px;
        height: 20px;
        color: #646cff;
    }
`;

// Подзаголовок карточки
export const CardSubtitle = styled.span`
    font-size: 0.9rem;
    color: #999;
    font-weight: 400;
    margin-left: auto;
`;

// Контент карточки
export const CardContent = styled.div`
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

// Секция внутри карточки
export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

// Заголовок секции
export const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
`;

// Заголовок секции
export const SectionTitle = styled.h4`
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: #e0e0e0;
    display: flex;
    align-items: center;
    gap: 8px;
    
    svg {
        width: 16px;
        height: 16px;
        color: #888;
    }
`;

// Секция с вкладками (более выраженная)
export const TabSection = styled.div`
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
`;

// Заголовок вкладки
export const TabHeader = styled.div`
    padding: 16px 20px;
    background: linear-gradient(135deg, #333 0%, #3a3a3a 100%);
    border-bottom: 1px solid #444;
    display: flex;
    align-items: center;
    gap: 10px;
`;

// Заголовок вкладки
export const TabTitle = styled.h4`
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
    
    svg {
        width: 16px;
        height: 16px;
        color: #888;
    }
`;

// Контент вкладки
export const TabContent = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

// Группа контролов
export const ControlGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    flex: ${({flex = "0 0 auto"}) => flex};
`;

// Информационный бейдж
export const InfoBadge = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background: rgba(100, 108, 255, 0.1);
    border: 1px solid rgba(100, 108, 255, 0.3);
    border-radius: 6px;
    font-size: 0.8rem;
    color: #646cff;
    white-space: nowrap;
`;

// Предупреждающий бейдж
export const WarningBadge = styled(InfoBadge)`
    background: rgba(255, 193, 7, 0.1);
    border-color: rgba(255, 193, 7, 0.3);
    color: #ffc107;
`;

// Успешный бейдж
export const SuccessBadge = styled(InfoBadge)`
    background: rgba(40, 167, 69, 0.1);
    border-color: rgba(40, 167, 69, 0.3);
    color: #28a745;
`;

// Опасный бейдж
export const DangerBadge = styled(InfoBadge)`
    background: rgba(220, 53, 69, 0.1);
    border-color: rgba(220, 53, 69, 0.3);
    color: #dc3545;
`;

// Кастомный скроллбар для контейнеров
export const ScrollableContainer = styled.div`
    overflow-y: auto;
    max-height: ${({maxHeight = "400px"}) => maxHeight};
    
    /* Custom scrollbar */
    &::-webkit-scrollbar {
        width: 8px;
    }
    
    &::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;

// Разделительная линия
export const Divider = styled.div`
    height: 1px;
    background: linear-gradient(90deg, transparent, #333, transparent);
    margin: ${({margin = "16px 0"}) => margin};
`;

// Контейнер для кнопок действий
export const ActionButtonContainer = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    
    @media (max-width: 768px) {
        gap: 8px;
    }
`;

// Базовая кнопка действия
export const ActionButton = styled.button`
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        background: #333;
        border-color: #555;
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    &.primary {
        background: #646cff;
        border-color: #646cff;

        &:hover {
            background: #5a5acf;
            border-color: #5a5acf;
        }
    }

    &.secondary {
        background: rgba(5, 150, 105, 0.66);
        border-color: #059669;

        &:hover {
            background: rgba(4, 120, 87, 0.5);
            border-color: #047857;
        }
    }

    &.danger {
        background: #dc2626;
        border-color: #dc2626;

        &:hover {
            background: #b91c1c;
            border-color: #b91c1c;
        }
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

// Вспомогательный текст
export const HelperText = styled.p`
    font-size: 0.85rem;
    color: #888;
    margin: 0;
    line-height: 1.4;
    
    &.error {
        color: #dc3545;
    }
    
    &.success {
        color: #28a745;
    }
    
    &.warning {
        color: #ffc107;
    }
`;