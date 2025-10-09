import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import styled from 'styled-components';
import { FixedSizeList as List, areEqual } from 'react-window';
import { createPortal } from 'react-dom';
import { TbSearch, TbX, TbTypography } from 'react-icons/tb';
import fonts from './cyrillic_fonts_minimal.json';
import Popup from './PopupComponent';

/**
 * ---------------------------------------------------------------------------
 *  CONFIG
 * ---------------------------------------------------------------------------
 */
const ITEM_HEIGHT = 72;
const LIST_HEIGHT = 600;
const LIST_WIDTH = 520;
const LIST_INNER_WIDTH = LIST_WIDTH - 2; // subtract border width
const PRELOAD_ITEMS = 15;

/**
 * ---------------------------------------------------------------------------
 *  STYLED COMPONENTS (based on tablePopupSharedStyles)
 * ---------------------------------------------------------------------------
 */
const SelectorWrapper = styled.div`
    position: relative;
    display: inline-block;
    margin-bottom: ${({ $mb }) => $mb};
`;

const SelectedFontButton = styled.button`
    background: #2a2a2a;
    border: 1px solid #444;
    color: #fff;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        background: #333;
        border-color: #555;
        transform: translateY(-1px);
    }

    svg {
        width: 16px;
        height: 16px;
        color: #646cff;
    }
`;

const PopupContent = styled.div`
    display: flex;
    padding: 24px;
    flex-direction: column;
    gap: 16px;
    width: ${LIST_WIDTH + 48}px;
    max-height: 85vh;
    box-sizing: border-box;
    min-width: 0;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Title = styled.h2`
    font-size: 1.8rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
    background: linear-gradient(135deg, #646cff, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: 10px;

    svg {
        color: #646cff;
        -webkit-text-fill-color: #646cff;
    }
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: #444;
        color: #fff;
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const SearchSection = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 0;
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
    box-sizing: border-box;
    min-width: 0;
`;

const SearchInputWrapper = styled.div`
    position: relative;
    flex: 1;
`;

const SearchInput = styled.input`
    box-sizing: border-box;
    width: 100%;
    padding: 12px 44px 12px 44px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 1rem;
    transition: all 0.2s ease;

    &::placeholder {
        color: #888;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
`;

const SearchIcon = styled.div`
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
    pointer-events: none;

    svg {
        width: 16px;
        height: 16px;
    }
`;

const ClearButton = styled.button`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
    transition: all 0.2s ease;

    &:hover {
        background: #444;
        color: #fff;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const ListContainer = styled.div`
    flex: 1;
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    box-sizing: border-box;
`;

const StyledList = styled(List)`
    overflow-x: hidden !important;

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: #2a2a2a;
    }

    &::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #666;
    }
`;

const FontOption = styled.div`
    padding: 12px 20px;
    color: #d6d6d6;
    font-size: 0.95rem;
    cursor: pointer;
    border-bottom: 1px solid #333;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
    min-width: 0;

    &:hover {
        background: #333;
    }

    &:last-child {
        border-bottom: none;
    }
`;

const FontName = styled.div`
    font-weight: 600;
    color: #fff;
    font-size: 1rem;
`;

const FontPreview = styled.div`
    color: #999;
    font-size: 0.85rem;
    line-height: 1.3;
`;

const EmptyContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px 20px;
    color: #999;
    text-align: center;
    box-sizing: border-box;

    svg {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
    }

    h3 {
        margin: 0 0 8px 0;
        color: #d6d6d6;
        font-size: 1.1rem;
    }

    p {
        margin: 0;
        font-size: 0.95rem;
    }
`;

const ResultsCount = styled.div`
    padding: 12px 20px;
    color: #999;
    font-size: 0.9rem;
    border-bottom: 1px solid #444;
    background: #333;
    box-sizing: border-box;
`;

/**
 * ---------------------------------------------------------------------------
 *  VIRTUALIZED ROW
 * ---------------------------------------------------------------------------
 */
const Row = memo(({ index, style, data }) => {
    const font = data.fonts[index];
    const handleClick = () => data.onSelectFont(font);

    return (
        <FontOption
            style={style}
            onClick={handleClick}
        >
            <FontName style={{ fontFamily: `'${font.family}', sans-serif` }}>
                {font.family}
            </FontName>
            <FontPreview style={{ fontFamily: `'${font.family}', sans-serif` }}>
                Пример: Привет, мир! Example text 123
            </FontPreview>
        </FontOption>
    );
}, areEqual);

/**
 * ---------------------------------------------------------------------------
 *  INNER POPUP
 * ---------------------------------------------------------------------------
 */
const FontSelectorPopup = ({ onClose, onSelectFont }) => {
    const [query, setQuery] = useState('');

    const filteredFonts = useMemo(() => {
        if (!query) return fonts;
        const lower = query.toLowerCase();
        return fonts.filter((f) => f.family.toLowerCase().includes(lower));
    }, [query]);

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <Title>
                        <TbTypography size={28} />
                        Select Font
                    </Title>
                    <CloseButton onClick={onClose}>
                        <TbX />
                    </CloseButton>
                </Header>

                <SearchSection>
                    <SearchInputWrapper>
                        <SearchIcon>
                            <TbSearch />
                        </SearchIcon>
                        <SearchInput
                            placeholder="Поиск шрифта..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <ClearButton
                            $visible={query.length > 0}
                            onClick={() => setQuery('')}
                        >
                            <TbX />
                        </ClearButton>
                    </SearchInputWrapper>
                </SearchSection>

                <ListContainer>
                    {filteredFonts.length > 0 && (
                        <ResultsCount>
                            Found {filteredFonts.length} font{filteredFonts.length !== 1 ? 's' : ''}
                        </ResultsCount>
                    )}

                    {filteredFonts.length > 0 ? (
                        <StyledList
                            height={LIST_HEIGHT}
                            width={LIST_INNER_WIDTH}
                            itemSize={ITEM_HEIGHT}
                            itemCount={filteredFonts.length}
                            itemData={{ fonts: filteredFonts, onSelectFont }}
                        >
                            {Row}
                        </StyledList>
                    ) : (
                        <EmptyContainer>
                            <TbSearch />
                            <h3>No fonts found</h3>
                            <p>Try a different search term</p>
                        </EmptyContainer>
                    )}
                </ListContainer>
            </PopupContent>
        </Popup>
    );
};

/**
 * ---------------------------------------------------------------------------
 *  MAIN COMPONENT
 * ---------------------------------------------------------------------------
 */
const FontSelector = ({ onSelect, initialFontName, marginbottom = '0px' }) => {
    const [selectedFont, setSelectedFont] = useState(
        fonts.find((f) => f.family === initialFontName) || fonts[0],
    );
    const [isOpen, setIsOpen] = useState(false);
    const popupRoot = document.getElementById('popup-root');

    useEffect(() => {
        const preload = async () => {
            const slice = fonts.slice(0, PRELOAD_ITEMS);
            await Promise.all(
                slice.map((f) => document.fonts.load(`16px '${f.family}'`)),
            );
        };

        if (document?.fonts?.status === 'loaded') return;
        window.requestIdleCallback(preload, { timeout: 2000 });
    }, []);

    const handleSelectFont = useCallback(
        (font) => {
            setSelectedFont(font);
            onSelect?.(font);
            setIsOpen(false);
        },
        [onSelect],
    );

    return (
        <SelectorWrapper $mb={marginbottom}>
            <SelectedFontButton
                onClick={() => setIsOpen((prev) => !prev)}
                style={{ fontFamily: `'${selectedFont.family}', sans-serif` }}
            >
                <TbTypography />
                {selectedFont.family}
            </SelectedFontButton>

            {isOpen && popupRoot &&
                createPortal(
                    <FontSelectorPopup
                        onClose={() => setIsOpen(false)}
                        onSelectFont={handleSelectFont}
                    />,
                    popupRoot,
                )}
        </SelectorWrapper>
    );
};

export default FontSelector;