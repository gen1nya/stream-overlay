import React from 'react';
import styled from 'styled-components';

const SwitchLabel = styled.label`
  position: relative;
  display: inline-block;
  margin-top: 4px;
  width: 44px;
  height: 24px;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ checked }) => (checked ? '#8853F2' : '#ccc')};
  transition: 0.3s;
  border-radius: 24px;

  &::before {
    content: '';
    position: absolute;
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
    transform: ${({ checked }) => (checked ? 'translateX(20px)' : 'translateX(0)')};
  }
`;

const Switch = ({ checked, onChange, ...props }) => (
    <SwitchLabel>
        <SwitchInput type="checkbox" checked={checked} onChange={onChange} {...props} />
        <SwitchSlider checked={checked} />
    </SwitchLabel>
);

export default Switch;
