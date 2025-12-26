import React from 'react';
import ReactDOM from 'react-dom';
import styled from "styled-components";

// TODO: Рефакторинг системы модалок
// Сейчас z-index управляется вручную в каждом компоненте:
// - MediaEventEditorPopup: 10000
// - InlineColorPicker: 10001
// - PopupComponent: 10002
//
// Идея: Единый PortalManager
// - Все модалки регистрируются в одном месте
// - Порядок отображения = порядок открытия (последний сверху)
// - Не нужно думать о z-index
// - Можно добавить: очередь, анимации, блокировку скролла
//
// Примерный API:
// const { openModal, closeModal } = usePortalManager();
// openModal(<MyModal />, { id: 'my-modal', priority: 'high' });

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
`;

const PopupContainer = styled.div`
    background: #2e2e2e;
    border-radius: 12px;
    min-width: 300px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

export default function Popup({ children, onClose }) {
    return ReactDOM.createPortal(
        <Overlay onClick={onClose}>
            <PopupContainer onClick={(e) => e.stopPropagation()}>
                {children}
            </PopupContainer>
        </Overlay>,
        document.getElementById('popup-root')
    );
}
