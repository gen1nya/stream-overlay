import React, { useState } from 'react';
import SeekbarComponent from "../../utils/SeekbarComponent";
import { Row } from "../SettingsComponent";
import { Spacer } from "../../utils/Separator";
import { TemplateEditor } from "../../utils/TemplateEditor";
import { SettingsBlockFull, SettingsBlockTitle } from "./SettingBloks";
import ColorSelectorButton from "./ColorSelectorButton";
import styled from "styled-components";
import {FiTrash2} from "react-icons/fi";

const CollapsedPreview = styled.div`
  font-family: monospace;
  background: #222;
  color: #ddd;
  padding: 0.5rem;
  border-radius: 6px;
  margin-top: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
`;

const Triangle = styled.span`
  font-size: 1.25rem;
  user-select: none;
  margin-left: 0.5rem;
`;

const RemoveButton = styled.button`
    background: none;
    color: #e74c3c;
    font-size: 0.9rem;
    cursor: pointer;
    margin-left: 1rem;
    border: 1px solid #e74c3c;
    border-radius: 4px;
    margin-bottom: -4px;
    
    transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease,
            opacity 0.2s ease;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &:hover:not(:disabled) {
        background: #e74c3c;
        color: white;
        border-color: white;
    }

    &:hover:disabled {
        border-color: white;
        color: white;
    }
`;


export default function FollowSettingsBlock({
                                                current,
                                                onChange,
                                                index,
                                                openColorPopup,
                                                onRemove,
                                                disableRemove = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const message = current.followMessage?.[index];

    const handleChange = (updater) => {
        onChange((prev) => {
            const updatedMessage =
                typeof updater === 'function' ? updater(prev.followMessage[index]) : updater;

            const updatedArray = [...prev.followMessage];
            updatedArray[index] = updatedMessage;

            return {
                ...prev,
                followMessage: updatedArray,
            };
        });
    };

    const toggleOpen = () => setIsOpen((prev) => !prev);

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle as="div">
                <TitleRow onClick={toggleOpen}>
                    <span>Follow вариант #{index + 1}</span>
                    <Triangle>{isOpen ? "▲" : "▼"}</Triangle>
                </TitleRow>
            </SettingsBlockTitle>

            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>
                    {message?.template ?? "🎉 {userName} just followed!"}
                </CollapsedPreview>
            )}

            {isOpen && (
                <>
                    <Row align={"flex-start"} gap="0.5rem">
                        <TemplateEditor
                            hint="Доступные плейсхолдеры: {userName}"
                            label="Шаблон для новых фолловеров"
                            value={message.template ?? "🎉 {userName} just followed!"}
                            onChange={(newValue) =>
                                handleChange((prev) => ({
                                    ...prev,
                                    template: newValue,
                                }))
                            }
                            fontSize={`${message?.fontSize ?? 16}px`}
                            onFontSizeChange={(newSize) =>
                                handleChange((prev) => ({
                                    ...prev,
                                    fontSize: newSize,
                                }))
                            }
                            placeholders={["userName"]}
                        />
                    </Row>

                    <Row>
                        <ColorSelectorButton
                            title={"Цвет фона:"}
                            hex={message?.backgroundColor ?? "#3e837c"}
                            alpha={message?.backgroundOpacity ?? 1.0}
                            onClick={() => {
                                openColorPopup({
                                    initialColor: message?.backgroundColor ?? "#3e837c",
                                    initialAlpha: message?.backgroundOpacity ?? 1.0,
                                    title: 'Цвет фона',
                                    onChange: (e) => {
                                        handleChange((prev) => ({
                                            ...prev,
                                            backgroundOpacity: e.alpha,
                                            backgroundColor: e.color,
                                        }))
                                    }
                                })
                            }}
                        />
                    </Row>

                    <Row>
                        <ColorSelectorButton
                            title={"Цвет обводки:"}
                            hex={message?.borderColor ?? "#3e837c"}
                            alpha={message?.borderOpacity ?? 1.0}
                            onClick={() => {
                                openColorPopup({
                                    initialColor: message?.borderColor ?? "#3e837c",
                                    initialAlpha: message?.borderOpacity ?? 1.0,
                                    title: 'Цвет обводки',
                                    onChange: (e) => {
                                        handleChange((prev) => ({
                                            ...prev,
                                            borderOpacity: e.alpha,
                                            borderColor: e.color,
                                        }))
                                    }
                                })
                            }}
                        />
                        <Spacer />
                        <SeekbarComponent
                            title="Радиус скругления:"
                            min="0"
                            max="20"
                            value={message?.borderRadius ?? 0}
                            step="1"
                            width={"150px"}
                            onChange={(e) =>
                                handleChange((prev) => ({
                                    ...prev,
                                    borderRadius: e,
                                }))
                            }
                        />
                    </Row>

                    <Row>
                        <ColorSelectorButton
                            title={"Цвет тени:"}
                            hex={message?.shadowColor ?? "#3e837c"}
                            alpha={message?.shadowOpacity ?? 1.0}
                            onClick={() => {
                                openColorPopup({
                                    initialColor: message?.shadowColor ?? "#3e837c",
                                    initialAlpha: message?.shadowOpacity ?? 1.0,
                                    title: 'Цвет тени',
                                    onChange: (e) => {
                                        handleChange((prev) => ({
                                            ...prev,
                                            shadowOpacity: e.alpha,
                                            shadowColor: e.color,
                                        }))
                                    }
                                })
                            }}
                        />
                        <Spacer />
                        <SeekbarComponent
                            title="Радиус тени:"
                            min="0"
                            max="20"
                            value={message?.shadowRadius ?? 0}
                            step="1"
                            width={"150px"}
                            onChange={(e) =>
                                handleChange((prev) => ({
                                    ...prev,
                                    shadowRadius: e,
                                }))
                            }
                        />
                    </Row>

                    <div>
                        <span>Отступы снаружи:</span>
                        <Row align="center" gap="0.5rem">
                            <SeekbarComponent
                                title="По горизонтали:"
                                min="0"
                                max="100"
                                value={message?.marginH ?? 0}
                                step="1"
                                width={"150px"}
                                onChange={(e) =>
                                    handleChange((prev) => ({
                                        ...prev,
                                        marginH: e,
                                    }))
                                }
                            />
                            <SeekbarComponent
                                title="По вертикали:"
                                min="0"
                                max="50"
                                value={message?.marginV ?? 0}
                                step="1"
                                width={"150px"}
                                onChange={(e) =>
                                    handleChange((prev) => ({
                                        ...prev,
                                        marginV: e,
                                    }))
                                }
                            />
                        </Row>
                    </div>

                    <div>
                        <span>Отступы внутри:</span>
                        <Row align="center" gap="0.5rem">
                            <SeekbarComponent
                                title="По горизонтали:"
                                min="0"
                                max="100"
                                value={message?.paddingH ?? 0}
                                step="1"
                                width={"150px"}
                                onChange={(e) =>
                                    handleChange((prev) => ({
                                        ...prev,
                                        paddingH: e,
                                    }))
                                }
                            />
                            <SeekbarComponent
                                title="По вертикали:"
                                min="0"
                                max="50"
                                value={message?.paddingV ?? 0}
                                step="1"
                                width={"150px"}
                                onChange={(e) =>
                                    handleChange((prev) => ({
                                        ...prev,
                                        paddingV: e,
                                    }))
                                }
                            />
                            <Spacer/>
                            <RemoveButton
                                onClick={() => onRemove?.(index)}
                                disabled={disableRemove}
                                title={disableRemove ? "Нельзя удалить последний элемент" : "Удалить"}
                            >
                                <FiTrash2 size={24}></FiTrash2>
                            </RemoveButton>
                        </Row>
                    </div>
                </>
            )}
        </SettingsBlockFull>
    );
}
