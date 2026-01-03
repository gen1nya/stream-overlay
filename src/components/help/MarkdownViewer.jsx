import React, { useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

// Initialize mermaid with dark theme
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#646cff',
        primaryTextColor: '#e0e0e0',
        primaryBorderColor: '#444',
        lineColor: '#666',
        secondaryColor: '#2a2a2a',
        tertiaryColor: '#1a1a1a',
        background: '#1a1a1a',
        mainBkg: '#2a2a2a',
        nodeBorder: '#646cff',
        clusterBkg: '#2a2a2a',
        clusterBorder: '#444',
        titleColor: '#e0e0e0',
        edgeLabelBackground: '#2a2a2a',
    },
    fontFamily: 'Segoe UI, system-ui, sans-serif',
});

const MarkdownContainer = styled.div`
    color: #e0e0e0;
    line-height: 1.7;
    font-size: 0.95rem;

    h1 {
        font-size: 2rem;
        font-weight: 600;
        margin: 0 0 24px 0;
        padding-bottom: 12px;
        border-bottom: 1px solid #333;
        color: #fff;
    }

    h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 32px 0 16px 0;
        color: #fff;
    }

    h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 24px 0 12px 0;
        color: #fff;
    }

    h4 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 20px 0 10px 0;
        color: #e0e0e0;
    }

    p {
        margin: 0 0 16px 0;
    }

    a {
        color: #646cff;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }

    strong {
        font-weight: 600;
        color: #fff;
    }

    em {
        font-style: italic;
        color: #ccc;
    }

    ul, ol {
        margin: 0 0 16px 0;
        padding-left: 24px;
    }

    li {
        margin-bottom: 6px;
    }

    blockquote {
        margin: 0 0 16px 0;
        padding: 12px 16px;
        border-left: 4px solid #646cff;
        background: rgba(100, 108, 255, 0.1);
        border-radius: 0 6px 6px 0;

        p:last-child {
            margin-bottom: 0;
        }
    }

    code {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.85em;
        background: rgba(100, 108, 255, 0.15);
        padding: 2px 6px;
        border-radius: 4px;
        color: #a5b4fc;
    }

    pre {
        margin: 0 0 16px 0;
        padding: 16px;
        background: #0d0d0d;
        border: 1px solid #333;
        border-radius: 8px;
        overflow-x: auto;

        code {
            background: none;
            padding: 0;
            font-size: 0.9em;
            color: #e0e0e0;
        }
    }

    table {
        width: 100%;
        margin: 0 0 16px 0;
        border-collapse: collapse;
        font-size: 0.9rem;
    }

    th, td {
        padding: 10px 14px;
        border: 1px solid #333;
        text-align: left;
    }

    th {
        background: #2a2a2a;
        font-weight: 600;
        color: #fff;
    }

    td {
        background: #1a1a1a;
    }

    tr:nth-child(even) td {
        background: #222;
    }

    hr {
        margin: 32px 0;
        border: none;
        border-top: 1px solid #333;
    }

    img {
        max-width: 100%;
        border-radius: 8px;
    }

    /* Task list */
    input[type="checkbox"] {
        margin-right: 8px;
    }
`;

const MermaidDiagram = styled.div`
    margin: 16px 0;
    padding: 16px;
    background: #0d0d0d;
    border: 1px solid #333;
    border-radius: 8px;
    overflow-x: auto;
    display: flex;
    justify-content: center;

    svg {
        max-width: 100%;
        height: auto;
    }
`;

const MermaidError = styled.div`
    padding: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: #ef4444;
    font-size: 0.85rem;
`;

function MermaidBlock({ code }) {
    const containerRef = useRef(null);
    const [error, setError] = React.useState(null);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!containerRef.current || !code) return;

            try {
                // Clear previous content
                containerRef.current.innerHTML = '';
                setError(null);

                // Generate unique ID
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                // Render mermaid
                const { svg } = await mermaid.render(id, code.trim());
                containerRef.current.innerHTML = svg;
            } catch (err) {
                console.error('Mermaid rendering error:', err);
                setError(err.message || 'Failed to render diagram');
            }
        };

        renderDiagram();
    }, [code]);

    if (error) {
        return (
            <MermaidError>
                Diagram error: {error}
            </MermaidError>
        );
    }

    return <MermaidDiagram ref={containerRef} />;
}

// Custom code block component
function CodeBlock({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';

    // Handle mermaid diagrams
    if (language === 'mermaid') {
        return <MermaidBlock code={String(children).replace(/\n$/, '')} />;
    }

    // Regular code blocks
    if (!inline && language) {
        return (
            <pre className={className} {...props}>
                <code className={className}>
                    {children}
                </code>
            </pre>
        );
    }

    // Inline code
    return (
        <code className={className} {...props}>
            {children}
        </code>
    );
}

export default function MarkdownViewer({ content }) {
    const components = useMemo(() => ({
        code: CodeBlock,
    }), []);

    if (!content) {
        return null;
    }

    return (
        <MarkdownContainer>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </MarkdownContainer>
    );
}
