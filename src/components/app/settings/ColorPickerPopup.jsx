// components/popups/ColorPickerPopup.js
import React, { useEffect, useMemo, useState } from 'react';
import Popup from '../../utils/PopupComponent';
import { Button, ModalHeader, ModalTitle, ModalBody, ModalFooter, ModalClose } from "../../../designSystem";
import { ColorPicker } from 'react-pick-color';
import throttle from 'lodash.throttle';
import {hexToRgba} from "../../../utils";
import { useTranslation } from "react-i18next";

export default function ColorPickerPopup({
                                             title,
                                             initialColor = "#ffffff",
                                             initialAlpha = 1,
                                             onClose,
                                             onColorChange
}) {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('settings.colorPicker.title');
    const [color, setColor] = useState(initialColor);
    const [alpha, setAlpha] = useState(initialAlpha || 1);

    // Мемоизированный throttled-коллбек
    const throttledCallback = useMemo(() => {
        return throttle((color, alpha) => {
            if (onColorChange) {
                console.log('Color changed:', color, 'Alpha:', alpha);
                onColorChange({color, alpha});
            }
        }, 300);
    }, [onColorChange]);

    useEffect(() => {
        throttledCallback(color, alpha);
    }, [color, alpha, throttledCallback]);

    return (
        <Popup onClose={onClose} maxWidth="360px">
            <ModalHeader $feature="general">
                <ModalTitle $feature="general">{resolvedTitle}</ModalTitle>
                <ModalClose onClick={onClose} />
            </ModalHeader>
            <ModalBody>
                <ColorPicker
                    color={hexToRgba(color, alpha)}
                    onChange={ (colorObj) => {
                        setColor(colorObj.hex);
                        setAlpha(colorObj.alpha);
                    }}
                    theme={
                        {
                            color: "#b6b6b6",
                            inputBackground: '#262626',
                            background: 'transparent',
                            boxShadow: '0 0 0 rgba(0, 0, 0, 0.0)',
                            borderColor: 'transparent',
                        }
                    }
                    hideInput={false}
                />
            </ModalBody>
            <ModalFooter>
                <Button $variant="ghost" onClick={onClose}>{t('common.close')}</Button>
            </ModalFooter>
        </Popup>
    );
}
