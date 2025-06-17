/*
* компоненты для ввода ссылок с подтверждением
* содержит поле для ввода и кнопку подстверждения
* Поле ввода валидирует ссылку (должно быть в формате URL, схемы file, http или https)
* При нажатии на кнопку подтверждения вызывается функция onConfirm с введенной ссылкой
* функция onConfirm находится в компоненте, который использует ConfirmableInputField
* Если функция вернула true - вызывается onSuccess, иначе onError
* Поле подсвечивается красным цветом при ошибке валидации
* кпонка имеет два состояние, "подтверждено" и "не подтверждено"
* * @param {Object} props - свойства компонента
* * @param {Function} props.onConfirm - функция, которая вызывается при подтверждении ввода
* * @param {Function} props.onSuccess - функция, которая вызывается при успешном подтверждении
* * @param {Function} props.onError - функция, которая вызывается при ошибке валидации
* * @param {string} props.placeholder - текст подсказки в поле ввода
*
* */

import React, { useState, useRef } from 'react';
import styled from 'styled-components';

const InputContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
`;

const InputField = styled.input`
    width: 100%;
    padding: 8px;
    border: 1px solid ${({ isValid }) => (isValid ? '#ccc' : 'red')};
    border-radius: 4px;
    font-size: 1rem;
    color: #333;
    background-color: #f9f9f9;

    &:focus {
        outline: none;
        border-color: ${({ isValid }) => (isValid ? '#646cff' : 'red')};
    }
`;

const ConfirmButton = styled.button`
    padding: 8px 12px;
    width: 120px;
    background-color: ${({ confirmed }) => (confirmed ? '#4caf50' : '#f44336')};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;

    &:hover {
        background-color: ${({ confirmed }) => (confirmed ? '#45a049' : '#d32f2f')};
    }
`;

export default function ConfirmableInputField({ onConfirm, onSuccess, onError, placeholder, initialValue = '' }) {
    const [inputValue, setInputValue] = useState(initialValue);
    const [isValid, setIsValid] = useState(true);
    const [confirmed, setConfirmed] = useState(false);
    const inputRef = useRef(null);

    const validateUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleConfirm = () => {
        if (validateUrl(inputValue)) {
            setIsValid(true);
            setConfirmed(true);
            Promise.resolve(onConfirm(inputValue)).then(success => {
                if (success) {
                    setConfirmed(true);
                    onSuccess(inputValue);
                } else {
                    setConfirmed(false);
                    onError('Confirmation failed');
                }
            });
        } else {
            setIsValid(false);
            onError('Invalid URL format');
        }
    };

    return (
        <InputContainer>
            <InputField
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                isValid={isValid}
                placeholder={placeholder}
            />
            <ConfirmButton confirmed={confirmed} onClick={handleConfirm}>
                {confirmed ? 'Confirmed' : 'Confirm'}
            </ConfirmButton>
        </InputContainer>
    );
}