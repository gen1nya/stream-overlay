import React, {useState, useRef, useEffect} from 'react';
import styled from 'styled-components';
import {Row} from "../app/SettingsComponent";

import {AiFillFolderOpen, AiOutlineCloseCircle, AiOutlinePaperClip} from "react-icons/ai";
import {getImageUrl, saveImageBuffer} from "../../services/api";

const InputContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const InputWrapper = styled.div`
    position: relative;
    width: 100%;//calc(100% - 120px);
`;

const InputField = styled.input`
    width: 100%;
    padding: 8px 66px 8px 8px;
    border: 1px solid ${({ isValid }) => (isValid ? '#ccc' : 'red')};
    border-radius: 4px;
    box-sizing: border-box;
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

const FileInput = styled.input`
    display: none;
`;

const AttachIcon = styled.label`
    position: absolute;
    right: 8px;
    top: 58%;
    transform: translateY(-50%);
    color: #311e64;
    cursor: pointer;

    &:hover {
        color: #8553f2;
    }

    svg {
        font-size: 1.2rem;
    }
`;

const ClearIcon = styled.label`
    position: absolute;
    right: 38px;
    top: 58%;
    transform: translateY(-50%);
    color: #311e64;
    cursor: pointer;

    &:hover {
        color: #ca2525;
    }

    svg {
        font-size: 1.2rem;
    }
`;

function isFilePath(str) {
    if (/^[a-zA-Z]+:\/\//.test(str)) return false;
    if (/^\s*$/.test(str)) return false;
    const fileName = str.split('/').pop();
    return /\.[a-zA-Z0-9]+$/.test(fileName) && !/\s/.test(str);
}

function isFileUrl(str) {
    try {
        const url = new URL(str);
        if (url.protocol !== 'https:') return false;
        const fileName = url.pathname.split('/').pop();
        return /\.[a-zA-Z0-9]+$/.test(fileName);
    } catch {
        return false;
    }
}

function validateInput(value) {
    return isFilePath(value) || isFileUrl(value);
}

export default function ConfirmableInputField({
                                                  onConfirm,
                                                  onSuccess,
                                                  onError,
                                                  placeholder,
                                                  initialValue = '',
                                                  onClear = () => {},
                                              }) {
    const [inputValue, setInputValue] = useState(initialValue);
    const [isValid, setIsValid] = useState(true);
    const [confirmed, setConfirmed] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const valid = validateInput(initialValue);
        setInputValue(initialValue);
        setIsValid(valid);
        setConfirmed(valid);
    }, [initialValue]);

    const handleConfirm = () => {
        const value = inputValue;
        const valid = validateInput(value);
        if (!valid) {
            setIsValid(false);
            setConfirmed(false);
            onError('Invalid input format');
            return;
        }

        setIsValid(true);
        setConfirmed(true);

        const result = {
            type: 'url',
            value,
        };

        Promise.resolve(onConfirm(result)).then(success => {
            if (success) {
                setConfirmed(true);
                onSuccess(result);
            } else {
                setConfirmed(false);
                onError('Confirmation failed');
            }
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const reader = new FileReader();

            reader.onload = async () => {
                const arrayBuffer = reader.result;
                const storedFilePath = await saveImageBuffer(file.name, arrayBuffer);
                const storedFileUrl = await getImageUrl(file.name);
                const img = new Image();
                img.src = storedFileUrl;

                img.onload = () => {
                    const aspectRatio = img.width / img.height;
                    const result = {
                        type: 'url',
                        value: storedFileUrl,
                        name: file.name,
                        width: img.width,
                        height: img.height,
                        aspectRatio,
                    };

                    onConfirm(result).then(success => {
                        if (success) {
                            setConfirmed(true);
                            setInputValue(file.name);
                            onSuccess(result);
                        } else {
                            setConfirmed(false);
                            onError('Failed to confirm file image');
                        }
                    });
                };

                img.onerror = () => {
                    onError('Could not load image from file');
                };
            };

            reader.onerror = () => {
                onError('Failed to read file');
            };

            reader.readAsArrayBuffer(file);
        } catch (err) {
            onError('Unexpected error: ' + err.message);
        }
    };

    return (
        <InputContainer>
            <Row>
                <InputWrapper>
                    <InputField
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        isValid={isValid}
                        placeholder={placeholder}
                    />
                    <AttachIcon htmlFor="file-input">
                        <AiFillFolderOpen size={24} />
                    </AttachIcon>
                    <ClearIcon onClick={() => {
                        setInputValue('');
                        setIsValid(true);
                        setConfirmed(false);
                        onClear();
                    }}>
                        <AiOutlineCloseCircle size={24} />
                    </ClearIcon>
                    <FileInput
                        id="file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                    />
                </InputWrapper>
                <ConfirmButton confirmed={confirmed} onClick={handleConfirm}>
                    {confirmed ? 'Confirmed' : 'Confirm'}
                </ConfirmButton>
            </Row>
        </InputContainer>
    );
}
