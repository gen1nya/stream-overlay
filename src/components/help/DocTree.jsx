import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { FiFolder, FiFileText, FiChevronRight, FiChevronDown } from 'react-icons/fi';

const TreeContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const TreeNode = styled.div`
    display: flex;
    flex-direction: column;
`;

const NodeHeader = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: ${props => props.$selected ? 'rgba(100, 108, 255, 0.15)' : 'transparent'};
    border: none;
    border-radius: 6px;
    color: ${props => props.$selected ? '#fff' : '#ccc'};
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
    width: 100%;

    &:hover {
        background: ${props => props.$selected ? 'rgba(100, 108, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
    }

    .chevron {
        width: 16px;
        height: 16px;
        color: #666;
        flex-shrink: 0;
        transition: transform 0.15s ease;
    }

    .icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        color: ${props => props.$isFolder ? '#f59e0b' : '#646cff'};
    }

    .name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const NodeChildren = styled.div`
    padding-left: 20px;
    display: ${props => props.$expanded ? 'flex' : 'none'};
    flex-direction: column;
    gap: 2px;
`;

const EmptyPlaceholder = styled.div`
    color: #666;
    font-size: 0.85rem;
    padding: 12px;
    text-align: center;
`;

function TreeNodeComponent({ node, selectedPath, onSelect, level = 0 }) {
    const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
    const isFolder = node.type === 'folder';
    const isSelected = !isFolder && selectedPath === node.path;

    const handleClick = useCallback(() => {
        if (isFolder) {
            setExpanded(prev => !prev);
        } else {
            onSelect(node.path, node.name);
        }
    }, [isFolder, node.path, node.name, onSelect]);

    return (
        <TreeNode>
            <NodeHeader
                onClick={handleClick}
                $selected={isSelected}
                $isFolder={isFolder}
            >
                {isFolder ? (
                    expanded ? (
                        <FiChevronDown className="chevron" />
                    ) : (
                        <FiChevronRight className="chevron" />
                    )
                ) : (
                    <span style={{ width: 16 }} />
                )}

                {isFolder ? (
                    <FiFolder className="icon" />
                ) : (
                    <FiFileText className="icon" />
                )}

                <span className="name" title={node.name}>
                    {node.name}
                </span>
            </NodeHeader>

            {isFolder && node.children && (
                <NodeChildren $expanded={expanded}>
                    {node.children.map((child) => (
                        <TreeNodeComponent
                            key={child.path}
                            node={child}
                            selectedPath={selectedPath}
                            onSelect={onSelect}
                            level={level + 1}
                        />
                    ))}
                </NodeChildren>
            )}
        </TreeNode>
    );
}

export default function DocTree({ nodes, selectedPath, onSelect }) {
    if (!nodes || nodes.length === 0) {
        return <EmptyPlaceholder>No documents available</EmptyPlaceholder>;
    }

    return (
        <TreeContainer>
            {nodes.map((node) => (
                <TreeNodeComponent
                    key={node.path}
                    node={node}
                    selectedPath={selectedPath}
                    onSelect={onSelect}
                />
            ))}
        </TreeContainer>
    );
}
