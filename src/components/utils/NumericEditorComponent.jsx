import React, {useEffect, useState, useRef} from 'react';
import styled from 'styled-components';
import {FiMinus, FiPlus, FiRotateCcw} from 'react-icons/fi';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: ${({$width}) => $width || 'auto'};
    min-width: 100px;
`;

const Label = styled.label`
    font-size: 0.8rem;
    font-weight: 500;
    color: #e0e0e0;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const InputGroup = styled.div`
    display: flex;
    align-items: center;
    background: #1e1e1e;
    border: 1px solid #444;
    border-radius: 8px;
    transition: all 0.2s ease;
    overflow: hidden;
    user-select: none;

    &:hover {
        border-color: #555;
        background: #252525;
    }

    &:focus-within {
        border-color: #646cff;
        background: #252525;
        box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
    }

    &.error {
        border-color: #dc2626;
        background: rgba(220, 38, 38, 0.05);
    }
`;

const StepButton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 28px;
    background: transparent;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    user-select: none;

    &:hover:not(.disabled) {
        background: rgba(255, 255, 255, 0.05);
        color: #ccc;
    }

    &:active:not(.disabled) {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(0.95);
    }

    &.disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    svg {
        width: 12px;
        height: 12px;
        stroke-width: 2.5;
        pointer-events: none;
    }
`;

const Input = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    font-size: 0.85rem;
    padding: 6px 8px;
    text-align: center;
    min-width: 0;
    user-select: text;

    /* Убираем стрелочки у number input */
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    &[type=number] {
        -moz-appearance: textfield;
    }

    &::placeholder {
        color: #666;
    }

    &:focus {
        color: #fff;
    }
`;

const ResetButton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 28px;
    background: transparent;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
    border-left: 1px solid #333;
    flex-shrink: 0;
    user-select: none;

    &:hover:not(.disabled) {
        background: rgba(255, 193, 7, 0.1);
        color: #ffc107;
    }

    &:active:not(.disabled) {
        transform: scale(0.95);
    }

    &.disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    svg {
        width: 12px;
        height: 12px;
        stroke-width: 2.5;
        pointer-events: none;
    }
`;

const ValidationInfo = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    color: #666;
    margin-top: 1px;
    min-height: 12px;
`;

const ErrorText = styled.span`
    color: #dc2626;
    font-size: 0.7rem;
`;

const RangeText = styled.span`
    color: #666;
`;

export default function NumericEditorComponent({
                                                   title,
                                                   value,
                                                   onChange,
                                                   min = 0,
                                                   max = 100,
                                                   step = 1,
                                                   width,
                                                   placeholder,
                                                   defaultValue,
                                                   showRange = true,
                                                   showReset = false,
                                                   disabled = false,
                                               }) {
    const [inputValue, setInputValue] = useState(String(value || ''));
    const [error, setError] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        setInputValue(String(value !== undefined && value !== null ? value : ''));
        setError('');
    }, [value]);

    const validateAndUpdate = (newValue) => {
        const numValue = Number(newValue);

        if (newValue === '' || isNaN(numValue)) {
            setError('Введите корректное число');
            return false;
        }

        if (numValue < min) {
            setError(`Минимальное значение: ${min}`);
            return false;
        }

        if (numValue > max) {
            setError(`Максимальное значение: ${max}`);
            return false;
        }

        setError('');
        onChange(numValue);
        return true;
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        // Валидируем только при потере фокуса или Enter
        if (!isFocused) {
            validateAndUpdate(newValue);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (inputValue === '') {
            // Если поле пустое, возвращаем предыдущее значение
            setInputValue(String(value !== undefined && value !== null ? value : ''));
            setError('');
        } else {
            validateAndUpdate(inputValue);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
        setError('');
        // Выделяем весь текст при фокусе для удобства редактирования
        setTimeout(() => {
            inputRef.current?.select();
        }, 0);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            inputRef.current?.blur();
        }
        if (e.key === 'Escape') {
            setInputValue(String(value !== undefined && value !== null ? value : ''));
            setError('');
            inputRef.current?.blur();
        }
    };

    const stepUp = () => {
        const currentNum = Number(inputValue) || 0;
        const newValue = Math.min(currentNum + step, max);
        setInputValue(String(newValue));
        onChange(newValue);
        setError('');
    };

    const stepDown = () => {
        const currentNum = Number(inputValue) || 0;
        const newValue = Math.max(currentNum - step, min);
        setInputValue(String(newValue));
        onChange(newValue);
        setError('');
    };

    const handleStepDown = (e) => {
        e.preventDefault();
        if (!canStepDown) return;
        stepDown();
    };

    const handleStepUp = (e) => {
        e.preventDefault();
        if (!canStepUp) return;
        stepUp();
    };

    const handleReset = (e) => {
        e.preventDefault();
        if (disabled) return;
        const resetValue = defaultValue !== undefined ? defaultValue : min;
        setInputValue(String(resetValue));
        onChange(resetValue);
        setError('');
    };

    const currentNum = Number(inputValue) || 0;
    const canStepUp = currentNum < max && !disabled;
    const canStepDown = currentNum > min && !disabled;

    return (
        <Container $width={width}>
            {title && <Label>{title}</Label>}

            <InputGroup className={error ? 'error' : ''}>
                <StepButton
                    className={!canStepDown ? 'disabled' : ''}
                    onMouseDown={handleStepDown}
                    title={`Уменьшить на ${step}`}
                >
                    <FiMinus />
                </StepButton>

                <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyPress}
                    placeholder={placeholder || String(min)}
                    disabled={disabled}
                />

                <StepButton
                    className={!canStepUp ? 'disabled' : ''}
                    onMouseDown={handleStepUp}
                    title={`Увеличить на ${step}`}
                >
                    <FiPlus />
                </StepButton>

                {showReset && (
                    <ResetButton
                        className={disabled ? 'disabled' : ''}
                        onMouseDown={handleReset}
                        title="Сбросить значение"
                    >
                        <FiRotateCcw />
                    </ResetButton>
                )}
            </InputGroup>

            <ValidationInfo>
                {error ? (
                    <ErrorText>{error}</ErrorText>
                ) : (
                    showRange && <RangeText>от {min} до {max}</RangeText>
                )}
            </ValidationInfo>
        </Container>
    );
}