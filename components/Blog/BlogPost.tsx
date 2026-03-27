import React, { useState } from "react";
import parse, { DOMNode, Element, domToReact } from "html-react-parser";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { Copy, Check } from "lucide-react";
import { useTheme } from "../ThemeContext";

// Copy button component for code blocks
function CodeCopyButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            className="code-copy-button"
            onClick={handleCopy}
            aria-label={copied ? "Copied!" : "Copy code"}
            title={copied ? "Copied!" : "Copy code"}
        >
            {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
    );
}

// Cursor Dark Theme colors for syntax highlighting
const cursorDarkTheme: { [key: string]: React.CSSProperties } = {
    'code[class*="language-"]': {
        color: "#d4d4d4",
        background: "#1e1e1e",
        fontFamily:
            "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
        fontSize: "14px",
        textAlign: "left" as const,
        whiteSpace: "pre" as const,
        wordSpacing: "normal",
        wordBreak: "normal" as const,
        wordWrap: "normal" as const,
        lineHeight: "1.6",
        tabSize: 4,
        hyphens: "none" as const,
    },
    'pre[class*="language-"]': {
        color: "#d4d4d4",
        background: "#1e1e1e",
        fontFamily:
            "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
        fontSize: "14px",
        textAlign: "left" as const,
        whiteSpace: "pre" as const,
        wordSpacing: "normal",
        wordBreak: "normal" as const,
        wordWrap: "normal" as const,
        lineHeight: "1.6",
        tabSize: 4,
        hyphens: "none" as const,
        padding: "1.5em",
        margin: "1.5em 0",
        overflow: "auto" as const,
        borderRadius: "8px",
    },
    comment: { color: "#6a9955", fontStyle: "italic" },
    prolog: { color: "#6a9955" },
    doctype: { color: "#6a9955" },
    cdata: { color: "#6a9955" },
    punctuation: { color: "#d4d4d4" },
    property: { color: "#9cdcfe" },
    tag: { color: "#569cd6" },
    boolean: { color: "#569cd6" },
    number: { color: "#b5cea8" },
    constant: { color: "#4fc1ff" },
    symbol: { color: "#4fc1ff" },
    deleted: { color: "#f44747" },
    selector: { color: "#d7ba7d" },
    "attr-name": { color: "#92c5f6" },
    string: { color: "#ce9178" },
    char: { color: "#ce9178" },
    builtin: { color: "#569cd6" },
    inserted: { color: "#6a9955" },
    operator: { color: "#d4d4d4" },
    entity: { color: "#dcdcaa" },
    url: { color: "#9cdcfe", textDecoration: "underline" },
    variable: { color: "#9cdcfe" },
    atrule: { color: "#569cd6" },
    "attr-value": { color: "#ce9178" },
    function: { color: "#dcdcaa" },
    "function-variable": { color: "#dcdcaa" },
    keyword: { color: "#569cd6" },
    regex: { color: "#d16969" },
    important: { color: "#569cd6", fontWeight: "bold" },
    bold: { fontWeight: "bold" },
    italic: { fontStyle: "italic" },
    namespace: { opacity: 0.7 },
    "class-name": { color: "#4ec9b0" },
    parameter: { color: "#9cdcfe" },
    decorator: { color: "#dcdcaa" },
};

// Cursor Light Theme colors for syntax highlighting
const cursorLightTheme: { [key: string]: React.CSSProperties } = {
    'code[class*="language-"]': {
        color: "#171717",
        background: "#f5f5f5",
        fontFamily:
            "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
        fontSize: "14px",
        textAlign: "left" as const,
        whiteSpace: "pre" as const,
        wordSpacing: "normal",
        wordBreak: "normal" as const,
        wordWrap: "normal" as const,
        lineHeight: "1.6",
        tabSize: 4,
        hyphens: "none" as const,
    },
    'pre[class*="language-"]': {
        color: "#171717",
        background: "#f5f5f5",
        fontFamily:
            "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
        fontSize: "14px",
        textAlign: "left" as const,
        whiteSpace: "pre" as const,
        wordSpacing: "normal",
        wordBreak: "normal" as const,
        wordWrap: "normal" as const,
        lineHeight: "1.6",
        tabSize: 4,
        hyphens: "none" as const,
        padding: "1.5em",
        margin: "1.5em 0",
        overflow: "auto" as const,
        borderRadius: "8px",
    },
    comment: { color: "#6a737d", fontStyle: "italic" },
    prolog: { color: "#6a737d" },
    doctype: { color: "#6a737d" },
    cdata: { color: "#6a737d" },
    punctuation: { color: "#24292e" },
    property: { color: "#005cc5" },
    tag: { color: "#22863a" },
    boolean: { color: "#005cc5" },
    number: { color: "#005cc5" },
    constant: { color: "#005cc5" },
    symbol: { color: "#e36209" },
    deleted: { color: "#b31d28", background: "#ffeef0" },
    selector: { color: "#22863a" },
    "attr-name": { color: "#6f42c1" },
    string: { color: "#032f62" },
    char: { color: "#032f62" },
    builtin: { color: "#005cc5" },
    inserted: { color: "#22863a", background: "#f0fff4" },
    operator: { color: "#d73a49" },
    entity: { color: "#6f42c1" },
    url: { color: "#005cc5", textDecoration: "underline" },
    variable: { color: "#e36209" },
    atrule: { color: "#005cc5" },
    "attr-value": { color: "#032f62" },
    function: { color: "#6f42c1" },
    "function-variable": { color: "#6f42c1" },
    keyword: { color: "#d73a49" },
    regex: { color: "#032f62" },
    important: { color: "#d73a49", fontWeight: "bold" },
    bold: { fontWeight: "bold" },
    italic: { fontStyle: "italic" },
    namespace: { opacity: 0.7 },
    "class-name": { color: "#6f42c1" },
    parameter: { color: "#24292e" },
    decorator: { color: "#6f42c1" },
};

// Tan Theme colors for syntax highlighting
const cursorTanTheme: { [key: string]: React.CSSProperties } = {
    'code[class*="language-"]': {
        color: "#1a1a1a",
        background: "#f0ece4",
        fontFamily:
            "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
        fontSize: "14px",
        textAlign: "left" as const,
        whiteSpace: "pre" as const,
        wordSpacing: "normal",
        wordBreak: "normal" as const,
        wordWrap: "normal" as const,
        lineHeight: "1.6",
        tabSize: 4,
        hyphens: "none" as const,
    },
    'pre[class*="language-"]': {
        color: "#1a1a1a",
        background: "#f0ece4",
        fontFamily:
            "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
        fontSize: "14px",
        textAlign: "left" as const,
        whiteSpace: "pre" as const,
        wordSpacing: "normal",
        wordBreak: "normal" as const,
        wordWrap: "normal" as const,
        lineHeight: "1.6",
        tabSize: 4,
        hyphens: "none" as const,
        padding: "1.5em",
        margin: "1.5em 0",
        overflow: "auto" as const,
        borderRadius: "8px",
    },
    comment: { color: "#7a7a7a", fontStyle: "italic" },
    prolog: { color: "#7a7a7a" },
    doctype: { color: "#7a7a7a" },
    cdata: { color: "#7a7a7a" },
    punctuation: { color: "#1a1a1a" },
    property: { color: "#8b7355" },
    tag: { color: "#8b5a2b" },
    boolean: { color: "#8b5a2b" },
    number: { color: "#8b5a2b" },
    constant: { color: "#8b5a2b" },
    symbol: { color: "#a67c52" },
    deleted: { color: "#b31d28" },
    selector: { color: "#6b8e23" },
    "attr-name": { color: "#8b7355" },
    string: { color: "#6b8e23" },
    char: { color: "#6b8e23" },
    builtin: { color: "#8b5a2b" },
    inserted: { color: "#6b8e23" },
    operator: { color: "#a67c52" },
    entity: { color: "#8b7355" },
    url: { color: "#8b7355", textDecoration: "underline" },
    variable: { color: "#a67c52" },
    atrule: { color: "#8b5a2b" },
    "attr-value": { color: "#6b8e23" },
    function: { color: "#8b7355" },
    "function-variable": { color: "#8b7355" },
    keyword: { color: "#8b5a2b" },
    regex: { color: "#6b8e23" },
    important: { color: "#8b5a2b", fontWeight: "bold" },
    bold: { fontWeight: "bold" },
    italic: { fontStyle: "italic" },
    namespace: { opacity: 0.7 },
    "class-name": { color: "#8b7355" },
    parameter: { color: "#1a1a1a" },
    decorator: { color: "#8b7355" },
};

interface BlogPostProps {
    content: string;
}

// Generate slug from heading text for anchor links
function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

// Helper to extract text from DOM Node for generating ID
function getTextFromDom(node: DOMNode): string {
    if (node.type === 'text' && node.data) {
        return node.data;
    }
    if (node instanceof Element && node.children) {
        return node.children.map(getTextFromDom).join('');
    }
    return '';
}

export default function BlogPost({ content }: BlogPostProps) {
    const { theme } = useTheme();

    const getCodeTheme = () => {
        switch (theme) {
            case "dark":
                return cursorDarkTheme;
            case "light":
                return cursorLightTheme;
            case "tan":
                return cursorTanTheme;
            default:
                return cursorDarkTheme;
        }
    };

    const options = {
        replace: (domNode: DOMNode) => {
            if (domNode instanceof Element) {
                // Handle Code Blocks: <pre><code>...</code></pre>
                if (domNode.name === 'pre' && domNode.children.length > 0) {
                    const firstChild = domNode.children[0];
                    if (firstChild instanceof Element && firstChild.name === 'code') {
                        const className = firstChild.attribs?.class || '';
                        const match = /language-(\w+)/.exec(className);
                        const language = match ? match[1] : 'text';
                        // Extract text content from the code block
                        const codeString = getTextFromDom(firstChild); // Or firstChild.children...

                        return (
                            <div className="code-block-wrapper">
                                {match && <span className="code-language">{language}</span>}
                                <CodeCopyButton code={codeString} />
                                <SyntaxHighlighter
                                    style={getCodeTheme()}
                                    language={language}
                                    PreTag="div"
                                >
                                    {codeString}
                                </SyntaxHighlighter>
                            </div>
                        );
                    }
                }

                // Handle Headings for IDs
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(domNode.name)) {
                    const text = getTextFromDom(domNode);
                    const id = generateSlug(text);
                    const ElementTag = domNode.name as any;

                    // Simple reconstruction, or use domToReact for children
                    // We need to preserve children (like em, strong, etc) inside headers
                    return React.createElement(
                        ElementTag,
                        { id, className: `blog-${domNode.name}` },
                        domToReact(domNode.children as any, options)
                    );
                }

                // Add blog-* classes to standard elements if needed, or rely on CSS
                if (domNode.name === 'a') {
                    return (
                        <a
                            href={domNode.attribs.href}
                            target={domNode.attribs.href?.startsWith("http") ? "_blank" : undefined}
                            rel={domNode.attribs.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="blog-link"
                        >
                            {domToReact(domNode.children as any, options)}
                        </a>
                    );
                }

                if (domNode.name === 'ul') return <ul className="blog-ul">{domToReact(domNode.children as any, options)}</ul>;
                if (domNode.name === 'ol') return <ol className="blog-ol">{domToReact(domNode.children as any, options)}</ol>;
                if (domNode.name === 'li') return <li className="blog-li">{domToReact(domNode.children as any, options)}</li>;
                if (domNode.name === 'blockquote') return <blockquote className="blog-blockquote">{domToReact(domNode.children as any, options)}</blockquote>;
                if (domNode.name === 'img') return (
                    <span className="blog-image-wrapper">
                        <img
                            src={domNode.attribs.src}
                            alt={domNode.attribs.alt || ""}
                            className="blog-image"
                            loading="lazy"
                        />
                        {domNode.attribs.alt && <span className="blog-image-caption">{domNode.attribs.alt}</span>}
                    </span>
                );
            }
        }
    };

    return (
        <article className="blog-post-content text-left">
            {parse(content, options)}
        </article>
    );
}
