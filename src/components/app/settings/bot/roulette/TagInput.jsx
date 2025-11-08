import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { IoClose } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

const Container = styled.div`
    min-height: 40px;
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background-color: #333333;
    cursor: text;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;

    &:focus-within {
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
    }
`;

const Tag = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background-color: #505761;
    color: #c9d5ff;
    font-size: 14px;
    border-radius: 4px;
    white-space: nowrap;
`;

const RemoveButton = styled.button`
    margin-left: 4px;
    background: none;
    border: none;
    color: #c9d5ff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;

    &:hover {
        color: #ffffff;
    }
`;

const Input = styled.input`
  flex: 1;
  min-width: 96px;
  outline: none;
  background: transparent;
  font-size: 14px;
  border: none;
  
  &::placeholder {
    color: #9ca3af;
  }
`;

export const TagInput = ({
                      value = "",
                      onChange,
                      placeholder,
                      hideDelete = false
                  }) => {
    const { t } = useTranslation();
    const placeholderText = placeholder ?? t('settings.bot.shared.tagInputPlaceholder');
    const [inputValue, setInputValue] = useState("");
    const [tags, setTags] = useState([]);
    const inputRef = useRef(null);

    console.log("TagInput rendered with value:", value);
    useEffect(() => {
        if (typeof value === 'string') {
            const parsedTags = value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
            setTags(parsedTags);
        }
    }, [value]);

    // Обновляем родителя при изменении тегов
    const updateParent = (newTags) => {
        onChange(newTags.join(", "));
    };

    const addTag = (tagText) => {
        const trimmed = tagText.trim();
        if (trimmed && !tags.includes(trimmed)) {
            const newTags = [...tags, trimmed];
            setTags(newTags);
            onChange(newTags.join(", ")); // Используем newTags напрямую
        }
        setInputValue("");
    };

    const removeTag = (indexToRemove) => {
        if (tags.length <= 1) return;

        const newTags = tags.filter((_, index) => index !== indexToRemove);
        console.log("Removing tag at index:", indexToRemove, "New tags:", newTags);
        setTags(newTags);
        onChange(newTags.join(", "));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (inputValue.trim()) {
                addTag(inputValue);
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 1) { // добавляем проверку > 1
            // Удаляем последний тег при Backspace на пустом поле
            removeTag(tags.length - 1);
        }
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value.replace(/\s/g, ''); // Убираем все пробелы

        if (newValue.includes(',')) {
            const parts = newValue.split(',');
            const tagToAdd = parts[0];
            if (tagToAdd.trim()) {
                addTag(tagToAdd);
            }
            setInputValue(parts.slice(1).join(','));
        } else {
            setInputValue(newValue);
        }
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    return (
        <Container onClick={handleContainerClick}>
            {tags.map((tag, index) => (
                <Tag key={index}>
                    {tag}
                    {!hideDelete && tags.length > 1 && (
                        <RemoveButton
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                        >
                            <IoClose size={14} />
                        </RemoveButton>
                    )}
                </Tag>
            ))}

            <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={tags.length === 0 ? placeholderText : ""}
            />
        </Container>
    );
};