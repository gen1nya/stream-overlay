import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { AddButton, ErrorText, FormRow, NameInput } from '../SharedBotStyles';
import RadioGroup from '../../../../utils/TextRadioGroup';
import Popup from '../../../../utils/PopupComponent';
import { useTranslation } from 'react-i18next';

const ItemsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    margin-top: 16px;
`;

const ItemCard = styled.div`
    background: ${props => {
    if (props.$rarity === 5) return 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)';
    if (props.$rarity === 4) return 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)';
    return 'rgba(30, 30, 30, 0.5)';
}};
    border: 1px solid ${props => {
    if (props.$rarity === 5) return 'rgba(251, 191, 36, 0.3)';
    if (props.$rarity === 4) return 'rgba(139, 92, 246, 0.3)';
    return '#333';
}};
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.2s ease;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
`;

const ItemHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const ItemName = styled.h4`
    margin: 0;
    color: #e0e0e0;
    font-size: 1rem;
    font-weight: 600;
`;

const RarityStars = styled.div`
    display: flex;
    gap: 2px;
    color: ${props => {
    if (props.$rarity === 5) return '#fbbf24';
    if (props.$rarity === 4) return '#a78bfa';
    return '#9ca3af';
}};
    font-size: 0.9rem;
`;

const ItemBadges = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const Badge = styled.span`
    display: inline-block;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    background: ${props => props.$bg || 'rgba(107, 114, 128, 0.2)'};
    color: ${props => props.$color || '#9ca3af'};
`;

const ItemActions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 4px;
`;

const IconButton = styled.button`
    padding: 6px 10px;
    border: 1px solid #555;
    border-radius: 6px;
    background: rgba(30, 30, 30, 0.8);
    color: ${props => props.$color || '#ccc'};
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    
    &:hover {
        background: rgba(40, 40, 40, 0.9);
        border-color: ${props => props.$color || '#777'};
    }
    
    svg {
        width: 14px;
        height: 14px;
    }
`;

const FilterBar = styled.div`
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    margin-top: 12px;
    flex-wrap: wrap;
`;

const FilterButton = styled.button`
    padding: 8px 16px;
    border: 1px solid ${props => props.$active ? '#646cff' : '#555'};
    border-radius: 8px;
    background: ${props => props.$active ? 'rgba(100, 108, 255, 0.2)' : 'rgba(30, 30, 30, 0.5)'};
    color: ${props => props.$active ? '#e0e0e0' : '#aaa'};
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    
    &:hover {
        background: ${props => props.$active ? 'rgba(100, 108, 255, 0.3)' : 'rgba(40, 40, 40, 0.8)'};
    }
`;

const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ccc;
    cursor: pointer;
    
    input {
        cursor: pointer;
    }
`;

// Popup Components
const PopupContent = styled.div`
    display: flex;
    padding: 20px;
    flex-direction: column;
    gap: 20px;
    min-width: 500px;
`;

const PopupTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
`;

const PopupButtons = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
`;

const PopupButton = styled.button`
    padding: 10px 20px;
    border: 1px solid ${props => props.$primary ? '#646cff' : '#555'};
    border-radius: 8px;
    background: ${props => props.$primary ? '#646cff' : 'rgba(30, 30, 30, 0.8)'};
    color: ${props => props.$danger ? '#dc2626' : '#d6d6d6'};
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s ease;
    
    &:hover {
        background: ${props => {
    if (props.$primary) return '#7c8aff';
    if (props.$danger) return 'rgba(220, 38, 38, 0.1)';
    return 'rgba(40, 40, 40, 0.9)';
}};
        border-color: ${props => props.$danger ? '#dc2626' : (props.$primary ? '#7c8aff' : '#777')};
    }
`;

const ConfirmText = styled.p`
    color: #ccc;
    font-size: 1rem;
    margin: 0;
    line-height: 1.5;
`;

// Item Form Popup
function ItemFormPopup({ item, allItems, onClose, onSave }) {
    const { t } = useTranslation();
    const isEdit = !!item;
    const [formData, setFormData] = useState(item || {
        id: '',
        name: '',
        rarity: 5,
        isLimited: false
    });
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};

        if (!formData.id.trim()) {
            errs.id = t('settings.bot.gacha.items.form.errors.idRequired');
        } else if (!isEdit && allItems.some(i => i.id === formData.id.trim())) {
            errs.id = t('settings.bot.gacha.items.form.errors.idDuplicate');
        }

        if (!formData.name.trim()) {
            errs.name = t('settings.bot.gacha.items.form.errors.nameRequired');
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave({
            ...formData,
            id: formData.id.trim(),
            name: formData.name.trim()
        });
    };

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <PopupTitle>{isEdit ? t('settings.bot.gacha.items.form.titleEdit') : t('settings.bot.gacha.items.form.titleAdd')}</PopupTitle>

                <FormRow>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', color: '#ccc' }}>{t('settings.bot.gacha.items.form.fields.id.label')}</label>
                        <NameInput
                            placeholder={t('settings.bot.gacha.items.form.fields.id.placeholder')}
                            value={formData.id}
                            $error={!!errors.id}
                            disabled={isEdit}
                            onChange={(e) => {
                                setFormData({ ...formData, id: e.target.value });
                                setErrors({ ...errors, id: null });
                            }}
                        />
                        {errors.id && <ErrorText>{errors.id}</ErrorText>}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', color: '#ccc' }}>{t('settings.bot.gacha.items.form.fields.name.label')}</label>
                        <NameInput
                            placeholder={t('settings.bot.gacha.items.form.fields.name.placeholder')}
                            value={formData.name}
                            $error={!!errors.name}
                            onChange={(e) => {
                                setFormData({ ...formData, name: e.target.value });
                                setErrors({ ...errors, name: null });
                            }}
                        />
                        {errors.name && <ErrorText>{errors.name}</ErrorText>}
                    </div>
                </FormRow>

                <div>
                    <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                        {t('settings.bot.gacha.items.form.fields.rarity.label')}
                    </label>
                    <RadioGroup
                        defaultSelected={formData.rarity.toString()}
                        items={[
                            { key: '5', text: '⭐⭐⭐⭐⭐' },
                            { key: '4', text: '⭐⭐⭐⭐' },
                            { key: '3', text: '⭐⭐⭐' }
                        ]}
                        direction="horizontal"
                        itemWidth="120px"
                        onChange={(value) => setFormData({ ...formData, rarity: parseInt(value) })}
                    />
                </div>

                {formData.rarity === 5 && (
                    <CheckboxLabel>
                        <input
                            type="checkbox"
                            checked={formData.isLimited}
                            onChange={(e) => setFormData({ ...formData, isLimited: e.target.checked })}
                        />
                        <span>{t('settings.bot.gacha.items.form.fields.isLimited')}</span>
                    </CheckboxLabel>
                )}

                <PopupButtons>
                    <PopupButton onClick={onClose}>
                        {t('settings.bot.gacha.items.actions.cancel')}
                    </PopupButton>
                    <PopupButton $primary onClick={handleSave}>
                        {isEdit ? t('settings.bot.gacha.items.actions.save') : t('settings.bot.gacha.items.actions.add')}
                    </PopupButton>
                </PopupButtons>
            </PopupContent>
        </Popup>
    );
}

// Confirm Delete Popup
function ConfirmDeletePopup({ itemName, onClose, onConfirm }) {
    const { t } = useTranslation();
    return (
        <Popup onClose={onClose}>
            <PopupContent style={{ minWidth: '400px' }}>
                <PopupTitle>{t('settings.bot.gacha.items.confirmDelete.title')}</PopupTitle>
                <ConfirmText>
                    {t('settings.bot.gacha.items.confirmDelete.message', { name: itemName })}
                    <br />
                    {t('settings.bot.gacha.items.confirmDelete.warning')}
                </ConfirmText>
                <PopupButtons>
                    <PopupButton onClick={onClose}>
                        {t('settings.bot.gacha.items.actions.cancel')}
                    </PopupButton>
                    <PopupButton $danger onClick={onConfirm}>
                        {t('settings.bot.gacha.items.actions.delete')}
                    </PopupButton>
                </PopupButtons>
            </PopupContent>
        </Popup>
    );
}

// Main Component
export default function ItemsManager({ items, bannerId, updateConfig }) {
    const { t } = useTranslation();
    const [filter, setFilter] = useState('all');
    const [activePopup, setActivePopup] = useState(null); // 'add', 'edit', 'delete'
    const [selectedItem, setSelectedItem] = useState(null);

    const filteredItems = items.filter(item => {
        if (filter === 'all') return true;
        return item.rarity === parseInt(filter);
    });

    const filtersConfig = useMemo(() => ({
        total: t('settings.bot.gacha.items.filters.all', { count: items.length }),
        five: t('settings.bot.gacha.items.filters.rarity.five', { count: items.filter(i => i.rarity === 5).length }),
        four: t('settings.bot.gacha.items.filters.rarity.four', { count: items.filter(i => i.rarity === 4).length }),
        three: t('settings.bot.gacha.items.filters.rarity.three', { count: items.filter(i => i.rarity === 3).length })
    }), [items, t]);

    const handleAddItem = (itemData) => {
        updateConfig(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    ...itemData,
                    bannerId
                }
            ]
        }));
        setActivePopup(null);
    };

    const handleEditItem = (itemData) => {
        updateConfig(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === itemData.id ? itemData : item
            )
        }));
        setActivePopup(null);
        setSelectedItem(null);
    };

    const handleDeleteItem = () => {
        updateConfig(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== selectedItem.id),
            banners: prev.banners.map(banner =>
                banner.id === bannerId
                    ? {
                        ...banner,
                        featured5StarId: banner.featured5StarId === selectedItem.id ? null : banner.featured5StarId,
                        featured4StarIds: (banner.featured4StarIds || []).filter(id => id !== selectedItem.id)
                    }
                    : banner
            )
        }));
        setActivePopup(null);
        setSelectedItem(null);
    };

    const renderStars = (rarity) => {
        return '⭐'.repeat(rarity);
    };

    return (
        <div>
            {/* Кнопка добавления */}
            <AddButton onClick={() => setActivePopup('add')}>
                <FiPlus />
                {t('settings.bot.gacha.items.actions.addItem')}
            </AddButton>

            {/* Фильтры */}
            <FilterBar>
                <FilterButton
                    $active={filter === 'all'}
                    onClick={() => setFilter('all')}
                >
                    {filtersConfig.total}
                </FilterButton>
                <FilterButton
                    $active={filter === '5'}
                    onClick={() => setFilter('5')}
                >
                    {filtersConfig.five}
                </FilterButton>
                <FilterButton
                    $active={filter === '4'}
                    onClick={() => setFilter('4')}
                >
                    {filtersConfig.four}
                </FilterButton>
                <FilterButton
                    $active={filter === '3'}
                    onClick={() => setFilter('3')}
                >
                    {filtersConfig.three}
                </FilterButton>
            </FilterBar>

            {/* Список предметов */}
            <ItemsGrid>
                {filteredItems.map(item => (
                    <ItemCard key={item.id} $rarity={item.rarity}>
                        <ItemHeader>
                            <ItemName>{item.name}</ItemName>
                            <RarityStars $rarity={item.rarity}>
                                {renderStars(item.rarity)}
                            </RarityStars>
                        </ItemHeader>

                        <ItemBadges>
                            <Badge $bg="rgba(100, 108, 255, 0.2)" $color="#7c8aff">
                                {t('settings.bot.gacha.items.badges.id', { id: item.id })}
                            </Badge>
                            {item.isLimited && (
                                <Badge $bg="rgba(251, 191, 36, 0.2)" $color="#fbbf24">
                                    {t('settings.bot.gacha.items.badges.limited')}
                                </Badge>
                            )}
                        </ItemBadges>

                        <ItemActions>
                            <IconButton
                                $color="#60a5fa"
                                onClick={() => {
                                    setSelectedItem(item);
                                    setActivePopup('edit');
                                }}
                            >
                                <FiEdit2 />
                                {t('settings.bot.gacha.items.actions.edit')}
                            </IconButton>
                            <IconButton
                                $color="#dc2626"
                                onClick={() => {
                                    setSelectedItem(item);
                                    setActivePopup('delete');
                                }}
                            >
                                <FiTrash2 />
                                {t('settings.bot.gacha.items.actions.delete')}
                            </IconButton>
                        </ItemActions>
                    </ItemCard>
                ))}
            </ItemsGrid>

            {filteredItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    {t('settings.bot.gacha.items.empty')}
                </div>
            )}

            {/* Popups */}
            {activePopup === 'add' && (
                <ItemFormPopup
                    allItems={items}
                    onClose={() => setActivePopup(null)}
                    onSave={handleAddItem}
                />
            )}

            {activePopup === 'edit' && selectedItem && (
                <ItemFormPopup
                    item={selectedItem}
                    allItems={items}
                    onClose={() => {
                        setActivePopup(null);
                        setSelectedItem(null);
                    }}
                    onSave={handleEditItem}
                />
            )}

            {activePopup === 'delete' && selectedItem && (
                <ConfirmDeletePopup
                    itemName={selectedItem.name}
                    onClose={() => {
                        setActivePopup(null);
                        setSelectedItem(null);
                    }}
                    onConfirm={handleDeleteItem}
                />
            )}
        </div>
    );
}