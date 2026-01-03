import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';

const TextareaWrapper = styled.div`
    position: relative;
    width: 100%;
`;

const StyledTextarea = styled.textarea`
    width: 100%;
    min-height: ${props => props.$minHeight || '80px'};
    padding: 12px 16px;
    padding-bottom: ${props => props.$showCounter ? '28px' : '12px'};
    border: 1px solid ${props => props.$isOverLimit ? '#dc2626' : '#555'};
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder {
        color: #888;
    }

    &:focus {
        outline: none;
        border-color: ${props => props.$isOverLimit ? '#dc2626' : '#646cff'};
        background: #252525;
    }
`;

const CharCounter = styled.div`
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 11px;
    color: ${props => props.$isOverLimit ? '#dc2626' : props.$isNearLimit ? '#fbbf24' : '#666'};
    pointer-events: none;
    user-select: none;
`;

/**
 * Textarea component with debounced onChange and character limit
 *
 * @param {string} value - Current value
 * @param {function} onChange - Callback when value changes (debounced)
 * @param {number} maxLength - Maximum character limit (default: 500 for Twitch)
 * @param {number} debounceMs - Debounce delay in ms (default: 300)
 * @param {boolean} showCounter - Show character counter (default: true)
 * @param {string} placeholder - Placeholder text
 * @param {string} minHeight - Minimum height CSS value
 *
 * Ref methods:
 * - insertText(text): Insert text at cursor position or at end
 * - focus(): Focus the textarea
 */
const DebouncedTextarea = forwardRef(function DebouncedTextarea({
    value,
    onChange,
    maxLength = 500,
    debounceMs = 300,
    showCounter = true,
    placeholder,
    minHeight,
    ...props
}, ref) {
    const [localValue, setLocalValue] = useState(value || '');
    const debounceTimerRef = useRef(null);
    const isInitialMount = useRef(true);
    const textareaRef = useRef(null);
    const lastSelectionRef = useRef({ start: 0, end: 0 });

    // Track selection on every interaction
    const updateSelection = useCallback(() => {
        if (textareaRef.current) {
            lastSelectionRef.current = {
                start: textareaRef.current.selectionStart,
                end: textareaRef.current.selectionEnd
            };
        }
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        insertText: (text) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            // Use current selection from DOM if textarea is focused, otherwise use last known
            const start = document.activeElement === textarea
                ? textarea.selectionStart
                : lastSelectionRef.current.start;
            const end = document.activeElement === textarea
                ? textarea.selectionEnd
                : lastSelectionRef.current.end;

            const before = localValue.substring(0, start);
            const after = localValue.substring(end);
            const newValue = before + text + after;

            // Check max length
            if (maxLength && newValue.length > maxLength) {
                return;
            }

            setLocalValue(newValue);

            // Trigger onChange immediately for better UX
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            onChange?.(newValue);

            // Set cursor position after the inserted text
            const newCursorPos = start + text.length;
            // Use setTimeout to ensure state has updated, then focus and set cursor
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                lastSelectionRef.current = { start: newCursorPos, end: newCursorPos };
            }, 0);
        },
        focus: () => {
            textareaRef.current?.focus();
        }
    }), [localValue, onChange, maxLength]);

    // Sync local value when external value changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        // Only update if different (avoid loops)
        if (value !== localValue) {
            setLocalValue(value || '');
        }
    }, [value]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleChange = useCallback((e) => {
        const newValue = e.target.value;

        // Enforce max length
        if (maxLength && newValue.length > maxLength) {
            return;
        }

        setLocalValue(newValue);

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounced callback
        debounceTimerRef.current = setTimeout(() => {
            onChange?.(newValue);
        }, debounceMs);
    }, [onChange, debounceMs, maxLength]);

    // Flush pending changes on blur
    const handleBlur = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (localValue !== value) {
            onChange?.(localValue);
        }
    }, [localValue, value, onChange]);

    const charCount = localValue.length;
    const isOverLimit = maxLength && charCount > maxLength;
    const isNearLimit = maxLength && charCount > maxLength * 0.9;

    return (
        <TextareaWrapper>
            <StyledTextarea
                ref={textareaRef}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onSelect={updateSelection}
                onKeyUp={updateSelection}
                onClick={updateSelection}
                placeholder={placeholder}
                $minHeight={minHeight}
                $showCounter={showCounter}
                $isOverLimit={isOverLimit}
                {...props}
            />
            {showCounter && maxLength && (
                <CharCounter $isOverLimit={isOverLimit} $isNearLimit={isNearLimit}>
                    {charCount}/{maxLength}
                </CharCounter>
            )}
        </TextareaWrapper>
    );
});

export default DebouncedTextarea;
