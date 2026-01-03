import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiX } from 'react-icons/fi';

const Container = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
`;

const BannerTab = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: ${props => props.$active
        ? 'var(--primary-color, #6366f1)'
        : 'var(--card-background, #2a2a3e)'};
    color: ${props => props.$active
        ? 'white'
        : 'var(--text-secondary, #a0a0b0)'};
    border: 1px solid ${props => props.$active
        ? 'var(--primary-color, #6366f1)'
        : 'var(--border-color, #3a3a4e)'};
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: ${props => props.$active ? '600' : '400'};
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$active
            ? 'var(--primary-color, #6366f1)'
            : 'var(--hover-background, #353548)'};
        border-color: var(--primary-color, #6366f1);
    }
`;

const DeleteButton = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    margin-left: 4px;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(239, 68, 68, 0.8);
    }

    svg {
        width: 12px;
        height: 12px;
    }
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: transparent;
    color: var(--text-secondary, #a0a0b0);
    border: 1px dashed var(--border-color, #3a3a4e);
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;

    &:hover {
        color: var(--primary-color, #6366f1);
        border-color: var(--primary-color, #6366f1);
        background: var(--hover-background, rgba(99, 102, 241, 0.1));
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export default function BannerSelector({
    banners = [],
    selectedBannerId,
    onSelect,
    onAdd,
    onDelete
}) {
    const { t } = useTranslation();

    const handleDelete = (e, bannerId) => {
        e.stopPropagation();
        if (banners.length <= 1) {
            return;
        }
        if (window.confirm(t('settings.bot.gacha.bannerSelector.confirmDelete'))) {
            onDelete(bannerId);
        }
    };

    return (
        <Container>
            {banners.map(banner => (
                <BannerTab
                    key={banner.id}
                    $active={banner.id === selectedBannerId}
                    onClick={() => onSelect(banner.id)}
                >
                    {banner.name || `Banner ${banner.id + 1}`}
                    {banners.length > 1 && (
                        <DeleteButton onClick={(e) => handleDelete(e, banner.id)}>
                            <FiX />
                        </DeleteButton>
                    )}
                </BannerTab>
            ))}
            <AddButton onClick={onAdd}>
                <FiPlus />
                {t('settings.bot.gacha.bannerSelector.addBanner')}
            </AddButton>
        </Container>
    );
}
