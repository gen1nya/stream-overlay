import React, {useEffect, useState, useRef} from 'react';
import styled from 'styled-components';
import {FiMinus, FiPlus, FiRotateCcw} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: ${({$width}) => $width || 'auto'};
    min-width: 100px;
`;

// Default dark theme colors
const defaultColors = {
    labelText: '#e0e0e0',
    background: '#1e1e1e',
    backgroundHover: '#252525',
    border: '#444',
    borderHover: '#555',
    borderFocus: '#646cff',
    inputText: '#fff',
    inputPlaceholder: '#666',
    buttonText: '#888',
    buttonTextHover: '#ccc',
    buttonHoverBg: 'rgba(255, 255, 255, 0.05)',
    buttonActiveBg: 'rgba(255, 255, 255, 0.1)',
    resetBorder: '#333',
    resetHoverBg: 'rgba(255, 193, 7, 0.1)',
    resetHoverText: '#ffc107',
    infoText: '#666',
    errorText: '#dc2626',
    errorBg: 'rgba(220, 38, 38, 0.05)',
};

const Label = styled.label`
    font-size: 0.8rem;
    font-weight: 500;
    color: ${({ $colors }) => $colors.labelText};
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const InputGroup = styled.div`
    display: flex;
    align-items: center;
    background: ${({ $colors }) => $colors.background};
    border: 1px solid ${({ $colors }) => $colors.border};
    border-radius: 8px;
    transition: all 0.2s ease;
    overflow: hidden;
    user-select: none;

    &:hover {
        border-color: ${({ $colors }) => $colors.borderHover};
        background: ${({ $colors }) => $colors.backgroundHover};
    }

    &:focus-within {
        border-color: ${({ $colors }) => $colors.borderFocus};
        background: ${({ $colors }) => $colors.backgroundHover};
        box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
    }

    &.error {
        border-color: ${({ $colors }) => $colors.errorText};
        background: ${({ $colors }) => $colors.errorBg};
    }
`;

const StepButton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 28px;
    background: transparent;
    color: ${({ $colors }) => $colors.buttonText};
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    user-select: none;

    &:hover:not(.disabled) {
        background: ${({ $colors }) => $colors.buttonHoverBg};
        color: ${({ $colors }) => $colors.buttonTextHover};
    }

    &:active:not(.disabled) {
        background: ${({ $colors }) => $colors.buttonActiveBg};
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
    color: ${({ $colors }) => $colors.inputText};
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
        color: ${({ $colors }) => $colors.inputPlaceholder};
    }

    &:focus {
        color: ${({ $colors }) => $colors.inputText};
    }
`;

const ResetButton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 28px;
    background: transparent;
    color: ${({ $colors }) => $colors.buttonText};
    cursor: pointer;
    transition: all 0.2s ease;
    border-left: 1px solid ${({ $colors }) => $colors.resetBorder};
    flex-shrink: 0;
    user-select: none;

    &:hover:not(.disabled) {
        background: ${({ $colors }) => $colors.resetHoverBg};
        color: ${({ $colors }) => $colors.resetHoverText};
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
    color: ${({ $colors }) => $colors.infoText};
    margin-top: 1px;
    min-height: 12px;
`;

const ErrorText = styled.span`
    color: ${({ $colors }) => $colors.errorText};
    font-size: 0.7rem;
`;

const RangeText = styled.span`
    color: ${({ $colors }) => $colors.infoText};
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
                                                   colorScheme,
                                               }) {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState(String(value || ''));
    const [error, setError] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);

    // Merge provided colors with defaults
    const colors = { ...defaultColors, ...colorScheme };

    useEffect(() => {
        setInputValue(String(value !== undefined && value !== null ? value : ''));
        setError('');
    }, [value]);

    const validateAndUpdate = (newValue) => {
        const numValue = Number(newValue);

        if (newValue === '' || isNaN(numValue)) {
            setError(t('settings.numericEditor.errors.invalid'));
            return false;
        }

        if (numValue < min) {
            setError(t('settings.numericEditor.errors.min', { value: min }));
            return false;
        }

        if (numValue > max) {
            setError(t('settings.numericEditor.errors.max', { value: max }));
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
            {title && <Label $colors={colors}>{title}</Label>}

            <InputGroup className={error ? 'error' : ''} $colors={colors}>
                <StepButton
                    className={!canStepDown ? 'disabled' : ''}
                    onMouseDown={handleStepDown}
                    title={t('settings.numericEditor.tooltips.decrease', { step })}
                    $colors={colors}
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
                    $colors={colors}
                />

                <StepButton
                    className={!canStepUp ? 'disabled' : ''}
                    onMouseDown={handleStepUp}
                    title={t('settings.numericEditor.tooltips.increase', { step })}
                    $colors={colors}
                >
                    <FiPlus />
                </StepButton>

                {showReset && (
                    <ResetButton
                        className={disabled ? 'disabled' : ''}
                        onMouseDown={handleReset}
                        title={t('settings.numericEditor.tooltips.reset')}
                        $colors={colors}
                    >
                        <FiRotateCcw />
                    </ResetButton>
                )}
            </InputGroup>

            <ValidationInfo $colors={colors}>
                {error ? (
                    <ErrorText $colors={colors}>{error}</ErrorText>
                ) : (
                    showRange && (
                        <RangeText $colors={colors}>
                            {t('settings.numericEditor.range', { min, max })}
                        </RangeText>
                    )
                )}
            </ValidationInfo>
        </Container>
    );
}