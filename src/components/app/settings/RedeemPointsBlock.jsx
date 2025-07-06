import React, {useState} from 'react';
import styled from 'styled-components';
import {Accordion} from "../../utils/AccordionComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import ColorSelectorComponent from "../../utils/ColorSelectorComponent";
import SeekbarComponent from "../../utils/SeekbarComponent";
import {Row} from "../SettingsComponent";
import Separator, {Spacer} from "../../utils/Separator";
import {TemplateEditor} from "../../utils/TemplateEditor";
import {
    CollapsedPreview,
    RemoveButton,
    SettingsBlockFull,
    SettingsBlockTitle,
    TitleRow,
    Triangle
} from "./SettingBloks";
import ColorSelectorButton from "./ColorSelectorButton";
import {FiTrash2} from "react-icons/fi";

export default function RedeemPointsBlock({
                                              current,
                                              onChange,
                                              index,
                                              openColorPopup,
                                              onRemove,
                                              disableRemove = false,
                                          }) {

    const [isOpen, setIsOpen] = useState(false);
    const message = current.redeemMessage?.[index];

    const handleChange =  (updater) => {
        onChange((prev) => {
            const updatedMessage =
                typeof updater === 'function' ? updater(prev.redeemMessage[index]) : updater;

            const updatedArray = [...prev.redeemMessage];
            updatedArray[index] = updatedMessage;

            return {
                ...prev,
                redeemMessage: updatedArray,
            };
        });
    };

    const toggleOpen = () => setIsOpen((prev) => !prev);

    return (
        <SettingsBlockFull>
            <SettingsBlockTitle as="div">
                <TitleRow onClick={toggleOpen}>
                    <span>Трата баллов вариант #{index + 1}</span>
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
                            hint={"Доступные плейсхолдеры: {userName}, {cost}, {title}"}
                            label="Шаблон для баллов канала"
                            value={message?.template ?? "🎉 {userName} потратил {cost} балов на {title}"}
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
                            placeholders={["userName", "cost", "title"]}
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
                        <Spacer/>
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
                        <Spacer/>
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
    )
}