import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiBook, FiX, FiChevronLeft } from 'react-icons/fi';
import DocTree from './DocTree';
import MarkdownViewer from './MarkdownViewer';
import { getDocsTree, getDocContent, searchDocs } from '../../services/api';

const Container = styled.div`
    display: flex;
    height: 100vh;
    background: #1a1a1a;
    color: #e0e0e0;
    font-family: 'Segoe UI', system-ui, sans-serif;
`;

const Sidebar = styled.div`
    width: 280px;
    min-width: 280px;
    background: #242424;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const SidebarHeader = styled.div`
    padding: 16px;
    border-bottom: 1px solid #333;
    background: linear-gradient(135deg, rgba(100, 108, 255, 0.1) 0%, transparent 100%);

    h2 {
        margin: 0 0 12px 0;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;

        svg {
            color: #646cff;
            width: 18px;
            height: 18px;
        }
    }
`;

const SearchBox = styled.div`
    position: relative;

    input {
        width: 100%;
        padding: 10px 12px 10px 36px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 0.9rem;
        outline: none;
        transition: border-color 0.2s ease;
        box-sizing: border-box;

        &:focus {
            border-color: #646cff;
        }

        &::placeholder {
            color: #666;
        }
    }

    svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #666;
        width: 16px;
        height: 16px;
    }
`;

const ClearButton = styled.button`
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;

    &:hover {
        color: #999;
        background: rgba(255, 255, 255, 0.1);
    }

    svg {
        position: static;
        transform: none;
        width: 14px;
        height: 14px;
    }
`;

const SidebarContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 3px;
    }
`;

const ContentArea = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    min-width: 0;
`;

const ContentHeader = styled.div`
    padding: 12px 20px;
    border-bottom: 1px solid #333;
    background: #242424;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
`;

const Breadcrumb = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #888;

    .current {
        color: #e0e0e0;
        font-weight: 500;
    }
`;

const BackButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    background: transparent;
    border: 1px solid #444;
    border-radius: 6px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(100, 108, 255, 0.1);
        border-color: #646cff;
        color: #646cff;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const ContentBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }
`;

const WelcomeScreen = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: #666;

    svg {
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        color: #444;
    }

    h3 {
        margin: 0 0 8px 0;
        color: #888;
        font-weight: 500;
    }

    p {
        margin: 0;
        font-size: 0.9rem;
    }
`;

const SearchResults = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SearchResultItem = styled.button`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 8px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(100, 108, 255, 0.1);
        border-color: #646cff;
    }

    .title {
        font-size: 0.95rem;
        font-weight: 500;
        color: #e0e0e0;
    }

    .match {
        font-size: 0.8rem;
        color: #888;
        line-height: 1.4;

        mark {
            background: rgba(100, 108, 255, 0.3);
            color: #fff;
            padding: 0 2px;
            border-radius: 2px;
        }
    }
`;

const NoResults = styled.div`
    padding: 24px;
    text-align: center;
    color: #666;
    font-size: 0.9rem;
`;

const LoadingIndicator = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: #666;
`;

export default function HelpWindow() {
    const { t, i18n } = useTranslation();
    const [tree, setTree] = useState([]);
    const [selectedPath, setSelectedPath] = useState(null);
    const [selectedTitle, setSelectedTitle] = useState('');
    const [content, setContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(true);

    // Get current locale (ru or en)
    const locale = i18n.language?.startsWith('ru') ? 'ru' : 'en';

    // Load document tree
    useEffect(() => {
        async function loadTree() {
            setLoading(true);
            try {
                const data = await getDocsTree(locale);
                setTree(data || []);

                // If tree is empty for current locale, try fallback
                if (!data || data.length === 0) {
                    const fallbackLocale = locale === 'ru' ? 'en' : 'ru';
                    const fallbackData = await getDocsTree(fallbackLocale);
                    setTree(fallbackData || []);
                }
            } catch (err) {
                console.error('Failed to load docs tree:', err);
                setTree([]);
            } finally {
                setLoading(false);
            }
        }

        loadTree();
    }, [locale]);

    // Load document content when selected
    useEffect(() => {
        if (!selectedPath) {
            setContent('');
            return;
        }

        async function loadContent() {
            try {
                const data = await getDocContent(locale, selectedPath);
                if (data) {
                    setContent(data);
                } else {
                    // Try fallback locale
                    const fallbackLocale = locale === 'ru' ? 'en' : 'ru';
                    const fallbackData = await getDocContent(fallbackLocale, selectedPath);
                    setContent(fallbackData || t('help.documentNotFound', 'Document not found'));
                }
            } catch (err) {
                console.error('Failed to load doc content:', err);
                setContent(t('help.loadError', 'Failed to load document'));
            }
        }

        loadContent();
    }, [selectedPath, locale, t]);

    // Search with debounce
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const results = await searchDocs(locale, searchQuery);
                setSearchResults(results || []);
            } catch (err) {
                console.error('Search failed:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, locale]);

    const handleSelect = useCallback((path, title) => {
        setSelectedPath(path);
        setSelectedTitle(title);
        setSearchQuery('');
        setSearchResults([]);
    }, []);

    const handleSearchResultClick = useCallback((result) => {
        handleSelect(result.path, result.title);
    }, [handleSelect]);

    const handleBack = useCallback(() => {
        setSelectedPath(null);
        setSelectedTitle('');
        setContent('');
    }, []);

    const highlightMatch = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? <mark key={i}>{part}</mark> : part
        );
    };

    return (
        <Container>
            <Sidebar>
                <SidebarHeader>
                    <h2>
                        <FiBook />
                        {t('help.title', 'Documentation')}
                    </h2>
                    <SearchBox>
                        <FiSearch />
                        <input
                            type="text"
                            placeholder={t('help.searchPlaceholder', 'Search...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <ClearButton onClick={() => setSearchQuery('')}>
                                <FiX />
                            </ClearButton>
                        )}
                    </SearchBox>
                </SidebarHeader>

                <SidebarContent>
                    {loading ? (
                        <LoadingIndicator>{t('help.loading', 'Loading...')}</LoadingIndicator>
                    ) : searchQuery ? (
                        isSearching ? (
                            <LoadingIndicator>{t('help.searching', 'Searching...')}</LoadingIndicator>
                        ) : searchResults.length > 0 ? (
                            <SearchResults>
                                {searchResults.map((result) => (
                                    <SearchResultItem
                                        key={result.path}
                                        onClick={() => handleSearchResultClick(result)}
                                    >
                                        <span className="title">{result.title}</span>
                                        {result.matches?.[0] && (
                                            <span className="match">
                                                {highlightMatch(result.matches[0], searchQuery)}
                                            </span>
                                        )}
                                    </SearchResultItem>
                                ))}
                            </SearchResults>
                        ) : (
                            <NoResults>{t('help.noResults', 'No results found')}</NoResults>
                        )
                    ) : (
                        <DocTree
                            nodes={tree}
                            selectedPath={selectedPath}
                            onSelect={handleSelect}
                        />
                    )}
                </SidebarContent>
            </Sidebar>

            <ContentArea>
                <ContentHeader>
                    {selectedPath && (
                        <>
                            <BackButton onClick={handleBack} title={t('help.back', 'Back')}>
                                <FiChevronLeft />
                            </BackButton>
                            <Breadcrumb>
                                <span className="current">{selectedTitle}</span>
                            </Breadcrumb>
                        </>
                    )}
                </ContentHeader>

                <ContentBody>
                    {selectedPath ? (
                        <MarkdownViewer content={content} />
                    ) : (
                        <WelcomeScreen>
                            <FiBook />
                            <h3>{t('help.welcome', 'Welcome to Documentation')}</h3>
                            <p>{t('help.selectDocument', 'Select a document from the sidebar to get started')}</p>
                        </WelcomeScreen>
                    )}
                </ContentBody>
            </ContentArea>
        </Container>
    );
}
