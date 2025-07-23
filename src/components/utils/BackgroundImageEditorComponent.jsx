import ConfirmableInputField from "./ConfirmableInputField";
import React, {useEffect} from "react";
import {SmallSubTitle} from "../app/settings/SettingBloks";
import {Row} from "../app/SettingsComponent";
import RadioGroup from "./TextRadioGroup";
import styled from "styled-components";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export default function BackgroundImageEditorComponent({
    message,
    onImageChanged,
}) {

    useEffect(() => {}, [message]);

    return (
        <Container>
            <SmallSubTitle>Шапка</SmallSubTitle>
            <ConfirmableInputField
                onConfirm={(data) => {
                    const imageUrl = data.value;
                    onImageChanged({ top: imageUrl });
                    resolve(true);
                }}
                onSuccess={value => {
                    console.log("Image confirmed:", value);
                }}
                onError={error => {
                    console.error("Error confirming image:", error);
                }}
                onClear={() => {
                    onImageChanged({ top: undefined });
                }}
                initialValue={message?.backgroundImages?.top ?? ""}
                placeholder="Введите ссылку на изображение или жмяк папку справа -->"
            />
            <Row>
                <SmallSubTitle>Тело</SmallSubTitle>

                <RadioGroup
                    defaultSelected={message?.backgroundImages?.middleAlign ?? 'top'}
                    items={[
                        { key: 'top', aiIcon: 'AiOutlineVerticalAlignTop' },
                        { key: 'center', aiIcon: 'AiOutlineVerticalAlignMiddle' },
                        { key: 'bottom', aiIcon: 'AiOutlineVerticalAlignBottom' },
                    ]}
                    direction="horizontal"
                    itemWidth="50px"
                    onChange={(v) => {
                        onImageChanged({middleAlign: v,})
                    }}
                />
            </Row>
            <ConfirmableInputField
                onConfirm={(data) => {
                    const imageUrl = data.value;
                    onImageChanged({ middle: imageUrl });
                    resolve(true);
                }}
                onSuccess={value => {
                    console.log("Image confirmed:", value);
                }}
                onError={error => {
                    console.error("Error confirming image:", error);
                }}
                onClear={() => {
                    onImageChanged({ middle: undefined });
                }}
                initialValue={message?.backgroundImages?.middle ?? ""}
                placeholder="Введите ссылку на изображение или жмяк папку справа -->"
            />
            <SmallSubTitle>Подвал</SmallSubTitle>
            <ConfirmableInputField
                onConfirm={(data) => {
                    const imageUrl = data.value;
                    onImageChanged({ bottom: imageUrl });
                    resolve(true);
                }}
                onSuccess={value => {
                    console.log("Image confirmed:", value);
                }}
                onError={error => {
                    console.error("Error confirming image:", error);
                }}
                onClear={() => {
                    onImageChanged({ bottom: undefined });
                }}
                initialValue={message?.backgroundImages?.bottom ?? ""}
                placeholder="Введите ссылку на изображение или жмяк папку справа -->"
            />

        </Container>
    );
}