import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import styled from 'styled-components';
import { FixedSizeList as List, areEqual } from 'react-window';
import { createPortal } from 'react-dom';
import fonts from './cyrillic_fonts_minimal.json';
import Popup from './PopupComponent';

/**
 * ---------------------------------------------------------------------------
 *  CONFIG (tweak here without touching the rest of the logic)
 * ---------------------------------------------------------------------------
 */
const ITEM_HEIGHT = 56;          // px — height of one option row
const LIST_HEIGHT = 600;         // px — height of the scroll container
const LIST_WIDTH  = 460;         // px — width of the scroll container
const PRELOAD_ITEMS = 15;        // how many top-items to preload on mount

/**
 * ---------------------------------------------------------------------------
 *  STYLED COMPONENTS
 * ---------------------------------------------------------------------------
 */
const SelectorWrapper = styled.div`
    position: relative;
    display: inline-block;
    margin-bottom: ${({ $mb }) => $mb};
`;

const SelectedFontButton = styled.button`
    padding: 4px 14px;
    border-radius: 8px;
    border: 1px solid #ccc;
    background: #2c2c2c;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
`;

const OptionPreview = styled.div`
    padding: 8px;
    width: 100%;            /* prevent horizontal overflow */
    box-sizing: border-box; /* include padding in the width calc */
    border-radius: 6px;
    background: #2a2a2a;
    color: #fff;
    font-size: 16px;
    cursor: pointer;

    &:hover {
        background: #3c3c3c;
    }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 6px 10px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #555;
  background: #1e1e1e;
  color: #fff;
  font-size: 15px;
  box-sizing: border-box;

  &::placeholder {
    color: #888;
  }
`;

const PopupInner = styled.div`
  width: ${LIST_WIDTH}px;
  max-height: ${LIST_HEIGHT + 48}px; /* search + list */
`;

/**
 * ---------------------------------------------------------------------------
 *  VIRTUALIZED ROW (memoised to avoid re-renders)
 * ---------------------------------------------------------------------------
 */
const Row = memo(({ index, style, data }) => {
    const font = data.fonts[index];
    const handleClick = () => data.onSelectFont(font);

    return (
        <OptionPreview
            style={{
                ...style,
                fontFamily: `'${font.family}', sans-serif`,
            }}
            onClick={handleClick}
        >
            {font.family} — Пример: Привет, мир!
        </OptionPreview>
    );
}, areEqual);

/**
 * ---------------------------------------------------------------------------
 *  INNER POPUP (search + virtualised list)
 * ---------------------------------------------------------------------------
 */
const FontSelectorPopup = ({ onClose, onSelectFont }) => {
    const [query, setQuery] = useState('');

    // Filter fonts lazily with memoization
    const filteredFonts = useMemo(() => {
        if (!query) return fonts;
        const lower = query.toLowerCase();
        return fonts.filter((f) => f.family.toLowerCase().includes(lower));
    }, [query]);

    return (
        <Popup onClose={onClose}>
            <PopupInner>
                <SearchInput
                    placeholder="Поиск шрифта…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                <List
                    height={LIST_HEIGHT}
                    width={LIST_WIDTH}
                    itemSize={ITEM_HEIGHT}
                    itemCount={filteredFonts.length}
                    itemData={{ fonts: filteredFonts, onSelectFont }}
                    style={{ overflowX: 'hidden' }}
                >
                    {Row}
                </List>
            </PopupInner>
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

    /**
     * Pre-load just enough fonts so the first paint is smooth.
     * Additional fonts will be fetched lazily as the list scrolls.
     */
    useEffect(() => {
        const preload = async () => {
            const slice = fonts.slice(0, PRELOAD_ITEMS);
            await Promise.all(
                slice.map((f) => document.fonts.load(`16px '${f.family}'`)),
            );
        };

        if (document?.fonts?.status === 'loaded') return; // already cached
        window.requestIdleCallback(preload, { timeout: 2000 });
    }, []);

    /** Handle selection */
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
