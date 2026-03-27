import { useState, useRef, useEffect } from "react";
import { Copy, MessageSquare, Sparkles } from "lucide-react";

interface CopyPageDropdownProps {
    title: string;
    content: string;
    url: string;
}

// Converts the blog post to markdown format for LLMs
function formatAsMarkdown(title: string, content: string, url: string): string {
    return `# ${title}\n\nSource: ${url}\n\n${content}`;
}

export default function CopyPageDropdown({
    title,
    content,
    url,
}: CopyPageDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle copy page action
    const handleCopyPage = async () => {
        const markdown = formatAsMarkdown(title, content, url);
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
            setIsOpen(false);
        }, 1500);
    };

    // Open in ChatGPT with the page content
    const handleOpenInChatGPT = () => {
        const markdown = formatAsMarkdown(title, content, url);
        const encodedText = encodeURIComponent(
            `Please analyze this article:\n\n${markdown}`,
        );
        window.open(`https://chat.openai.com/?q=${encodedText}`, "_blank");
        setIsOpen(false);
    };

    // Open in Claude with the page content
    const handleOpenInClaude = () => {
        const markdown = formatAsMarkdown(title, content, url);
        const encodedText = encodeURIComponent(
            `Please analyze this article:\n\n${markdown}`,
        );
        window.open(`https://claude.ai/new?q=${encodedText}`, "_blank");
        setIsOpen(false);
    };

    return (
        <div className="copy-page-dropdown" ref={dropdownRef}>
            {/* Trigger button */}
            <button
                className="copy-page-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Copy size={14} />
                <span>Copy page</span>
                <svg
                    className={`dropdown-chevron ${isOpen ? "open" : ""}`}
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M2.5 4L5 6.5L7.5 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="copy-page-menu">
                    {/* Copy page option */}
                    <button className="copy-page-item" onClick={handleCopyPage}>
                        <Copy size={16} className="copy-page-icon" />
                        <div className="copy-page-item-content">
                            <span className="copy-page-item-title">
                                {copied ? "Copied!" : "Copy page"}
                            </span>
                            <span className="copy-page-item-desc">
                                Copy page as Markdown for LLMs
                            </span>
                        </div>
                    </button>

                    {/* Open in ChatGPT */}
                    <button className="copy-page-item" onClick={handleOpenInChatGPT}>
                        <MessageSquare size={16} className="copy-page-icon" />
                        <div className="copy-page-item-content">
                            <span className="copy-page-item-title">
                                Open in ChatGPT
                                <span className="external-arrow">↗</span>
                            </span>
                            <span className="copy-page-item-desc">
                                Ask questions about this page
                            </span>
                        </div>
                    </button>

                    {/* Open in Claude */}
                    <button className="copy-page-item" onClick={handleOpenInClaude}>
                        <Sparkles size={16} className="copy-page-icon" />
                        <div className="copy-page-item-content">
                            <span className="copy-page-item-title">
                                Open in Claude
                                <span className="external-arrow">↗</span>
                            </span>
                            <span className="copy-page-item-desc">
                                Ask questions about this page
                            </span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
