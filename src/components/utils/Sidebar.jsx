import React from "react";
import styled from "styled-components";
import { FiHome, FiSettings } from "react-icons/fi";

const Wrapper = styled.div`
  width: ${(props) => (props.open ? "200px" : "60px")};
  transition: width 0.3s ease;
  background-color: #1e1e1e;
  color: white;
  margin: 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  border: transparent solid 1px;
  background-color: ${(props) => (props.active ? "#333" : "transparent")};

  &:hover {
    background-color: #444;
    border: #535bf2 solid 1px;
  }

  svg {
    margin-right: ${(props) => (props.open ? "10px" : "0")};
  }
`;

const Label = styled.span`
  opacity: ${(props) => (props.open ? 1 : 0)};
  transition: opacity 0.2s ease;
  white-space: nowrap;
`;

export const Sidebar = ({ open, active, onSelect, items }) => {
    return (
        <Wrapper open={open}>
            {items.map((item) => (
                <Item
                    key={item.key}
                    active={active === item.key}
                    open={open}
                    onClick={() => onSelect(item.key)}
                >
                    {item.icon}
                    <Label open={open}>{item.label}</Label>
                </Item>
            ))}
        </Wrapper>
    );
};
