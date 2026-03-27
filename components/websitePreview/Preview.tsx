import React, { useState } from 'react';
import { LandingPageConfig } from '../../types';
import { Loader2, CheckCircle2, X, Menu } from 'lucide-react';

interface PreviewProps {
    config: LandingPageConfig;
    isMobile: boolean;
}

export const Preview: React.FC<PreviewProps> = ({ config, isMobile }) => {
    const [formState, setFormState] = useState<'idle' | 'submitting' | 'success'>('idle');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const safeColor = (color: string) => {
        return /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : config.theme.primaryColor;
    };

    const primaryColor = safeColor(config.theme.primaryColor);
    const bgColor = safeColor(config.theme.backgroundColor);
    const textColor = safeColor(config.theme.textColor);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormState('submitting');
        setTimeout(() => {
            setFormState('success');
            setTimeout(() => {
                setFormState('idle');
                setIsModalOpen(false);
            }, 3000);
        }, 1500);
    };

    const fontOptions = {
        'serif': { name: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap', family: '"Playfair Display", serif' },
        'sans': { name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', family: '"Inter", sans-serif' },
        'roboto': { name: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap', family: '"Roboto", sans-serif' },
        'open-sans': { name: 'Open Sans', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap', family: '"Open Sans", sans-serif' },
        'lora': { name: 'Lora', url: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;600&display=swap', family: '"Lora", serif' },
        'merriweather': { name: 'Merriweather', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap', family: '"Merriweather", serif' },
        'montserrat': { name: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap', family: '"Montserrat", sans-serif' },
        'lato': { name: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap', family: '"Lato", sans-serif' },
        'poppins': { name: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap', family: '"Poppins", sans-serif' },
        'oswald': { name: 'Oswald', url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&display=swap', family: '"Oswald", sans-serif' },
        'raleway': { name: 'Raleway', url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;600&display=swap', family: '"Raleway", sans-serif' },
    };

    const currentFont = fontOptions[config.theme.fontStyle as keyof typeof fontOptions] || fontOptions['serif'];

    const containerClass = "w-full h-full overflow-y-auto bg-white relative no-scrollbar";

    const dynamicStyle = {
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: currentFont.family,
    } as React.CSSProperties;

    // We can't easily dynamically change Tailwind classes for exact fonts without safelisting all of them.
    // Instead we rely on the inline style 'fontFamily' inherited from container.
    // We still keep fontClass for generic weight/spacing if needed, or we just rely on inheritance.
    const fontClass = ''; // Tailwind classes for fonts are less useful here if we use arbitrary values
    const sansClass = ''; // Resetting these since we use global font family on container

    React.useEffect(() => {
        if (!document.getElementById(`font-${config.theme.fontStyle}`)) {
            const link = document.createElement('link');
            link.id = `font-${config.theme.fontStyle}`;
            link.rel = 'stylesheet';
            link.href = currentFont.url;
            document.head.appendChild(link);
        }
    }, [config.theme.fontStyle, currentFont.url]);

    const WaitlistModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="relative w-full max-w-md bg-white rounded-lg shadow-2xl p-8"
                style={{ backgroundColor: bgColor === '#FFFFFF' ? '#F9F8F4' : '#FFFFFF', color: '#1a1a1a' }}
            >
                <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <h2 className={`text-2xl font-bold mb-2 ${fontClass}`}>{config.form.title}</h2>
                    <p className={`text-sm opacity-70 ${sansClass}`}>{config.form.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {config.form.fields.name && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            className={`w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 focus:border-black/60 outline-none transition-colors rounded-md shadow-sm ${sansClass}`}
                        />
                    )}
                    {config.form.fields.email && (
                        <input
                            type="email"
                            placeholder="Email Address"
                            required
                            className={`w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 focus:border-black/60 outline-none transition-colors rounded-md shadow-sm ${sansClass}`}
                        />
                    )}
                    {config.form.fields.phone && (
                        <input
                            type="tel"
                            placeholder="Phone Number"
                            className={`w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 focus:border-black/60 outline-none transition-colors rounded-md shadow-sm ${sansClass}`}
                        />
                    )}

                    <button
                        type="submit"
                        disabled={formState !== 'idle'}
                        className="mt-2 w-full py-3 px-6 text-white font-medium tracking-wide transition-all hover:opacity-90 active:scale-[0.98] flex justify-center items-center gap-2 rounded-md shadow-md"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {formState === 'submitting' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : formState === 'success' ? (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Sent!
                            </>
                        ) : (
                            config.form.buttonText
                        )}
                    </button>
                    {formState === 'success' && (
                        <p className={`text-center text-sm mt-2 text-green-600 animate-fade-in ${sansClass}`}>
                            {config.form.successMessage}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );

    return (
        <div className={`transition-all duration-300 ${containerClass}`} style={dynamicStyle}>


            {/* Modal */}
            {isModalOpen && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div
                        className="relative w-full max-w-md bg-white rounded-lg shadow-2xl p-8 max-h-[90%] overflow-y-auto"
                        style={{ backgroundColor: bgColor === '#FFFFFF' ? '#F9F8F4' : '#FFFFFF', color: '#1a1a1a' }}
                    >
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-1 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <h2 className={`text-2xl font-bold mb-2 ${fontClass}`}>{config.form.title}</h2>
                            <p className={`text-sm opacity-70 ${sansClass}`}>{config.form.description}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
                            {config.form.fields.name && (
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    required
                                    className={`w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 focus:border-black/60 outline-none transition-colors rounded-md shadow-sm ${sansClass}`}
                                />
                            )}
                            {config.form.fields.email && (
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    required
                                    className={`w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 focus:border-black/60 outline-none transition-colors rounded-md shadow-sm ${sansClass}`}
                                />
                            )}
                            {config.form.fields.phone && (
                                <input
                                    type="tel"
                                    placeholder="Phone Number"
                                    className={`w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 focus:border-black/60 outline-none transition-colors rounded-md shadow-sm ${sansClass}`}
                                />
                            )}

                            <button
                                type="submit"
                                disabled={formState !== 'idle'}
                                className="mt-2 w-full py-3 px-6 text-white font-medium tracking-wide transition-all hover:opacity-90 active:scale-[0.98] flex justify-center items-center gap-2 rounded-md shadow-md"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {formState === 'submitting' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : formState === 'success' ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Sent!
                                    </>
                                ) : (
                                    config.form.buttonText
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className={`px-6 py-6 flex justify-between items-center z-40 transition-colors duration-300 ${config.hero.layout === 'full-width' ? 'absolute top-0 left-0 right-0 bg-transparent text-white' : 'sticky top-0 backdrop-blur-md bg-opacity-90'}`} style={config.hero.layout === 'default' ? { backgroundColor: `${bgColor}F0` } : {}}>
                <div className={`text-2xl font-bold tracking-tight ${fontClass}`}>
                    {config.header.logoType === 'image' && config.header.logoUrl ? (
                        <img src={config.header.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                    ) : (
                        <span className={config.hero.layout === 'full-width' ? 'drop-shadow-md' : ''}>{config.header.logoText}</span>
                    )}
                </div>

                {config.header.showNav && (
                    <>
                        {/* Desktop Nav */}
                        <nav className={`hidden md:flex gap-6 text-sm font-medium ${config.hero.layout === 'full-width' ? 'text-white/90' : 'opacity-80'}`}>
                            {config.header.navItems.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.target}`}
                                    className={`hover:opacity-100 transition-opacity ${config.hero.layout === 'full-width' ? 'drop-shadow-sm' : ''}`}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>

                        {/* Mobile Menu Toggle */}
                        {isMobile && (
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2">
                                {isMenuOpen ? (
                                    <X className={`w-6 h-6 ${config.hero.layout === 'full-width' ? 'text-white' : ''}`} />
                                ) : (
                                    <Menu className={`w-6 h-6 ${config.hero.layout === 'full-width' ? 'text-white' : ''}`} />
                                )}
                            </button>
                        )}
                    </>
                )}
            </header>

            {/* Mobile Menu Overlay */}
            {isMobile && isMenuOpen && config.header.showNav && (
                <div className="fixed inset-0 z-30 bg-white/95 backdrop-blur-md pt-24 px-6 animate-fade-in" style={{ color: config.theme.textColor }}>
                    <nav className="flex flex-col gap-6 text-xl font-medium text-center">
                        {config.header.navItems.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.target}`}
                                onClick={() => setIsMenuOpen(false)}
                                className="opacity-80 hover:opacity-100"
                            >
                                {item.label}
                            </a>
                        ))}
                        <button
                            onClick={() => { setIsMenuOpen(false); setIsModalOpen(true); }}
                            className="mt-4 px-8 py-3 bg-black text-white rounded-full font-medium"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {config.hero.ctaText || "Join Waitlist"}
                        </button>
                    </nav>
                </div>
            )}

            {/* Hero Section */}
            {config.hero.layout === 'full-width' ? (
                <section id="hero" className="relative h-[600px] md:h-[800px] flex items-center justify-center text-center px-6 scroll-mt-0">
                    <div className="absolute inset-0 z-0">
                        {config.hero.mediaType === 'video' ? (
                            <video src={config.hero.mediaUrl} autoPlay muted loop className="w-full h-full object-cover" />
                        ) : (
                            <img src={config.hero.mediaUrl} alt="Hero Background" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40"></div>
                    </div>

                    <div className="relative z-10 max-w-4xl flex flex-col items-center gap-6 text-white">
                        <h1 className={`text-4xl md:text-7xl font-bold leading-tight drop-shadow-lg ${fontClass}`}>
                            {config.hero.title}
                        </h1>
                        <p className={`text-lg md:text-2xl opacity-90 max-w-2xl leading-relaxed drop-shadow-md ${sansClass}`}>
                            {config.hero.subtitle}
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 px-8 py-4 bg-white text-black font-semibold rounded-full shadow-xl transition-all active:scale-95"
                        >
                            {config.hero.ctaText || "Join the Waitlist"}
                        </button>
                    </div>
                </section>
            ) : (
                <section id="hero" className="px-6 py-12 md:py-20 max-w-4xl mx-auto text-center flex flex-col items-center gap-8 scroll-mt-20">
                    <h1 className={`text-4xl md:text-6xl font-medium leading-tight ${fontClass}`}>
                        {config.hero.title}
                    </h1>
                    <p className={`text-lg md:text-xl opacity-70 max-w-2xl leading-relaxed ${sansClass}`}>
                        {config.hero.subtitle}
                    </p>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-8 py-3 text-white font-medium rounded-md shadow-lg hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {config.hero.ctaText || "Join the Waitlist"}
                    </button>

                    {config.hero.showMedia && config.hero.mediaUrl && (
                        <div className="w-full mt-8 rounded-lg overflow-hidden shadow-xl aspect-video relative bg-gray-100 group">
                            {config.hero.mediaType === 'video' ? (
                                <video
                                    src={config.hero.mediaUrl}
                                    autoPlay
                                    muted
                                    loop
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src={config.hero.mediaUrl}
                                    alt="Hero"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* Features Section */}
            <section id="features" className="px-6 py-16 md:py-24 border-t border-black/5 scroll-mt-20" style={{ borderColor: `${textColor}10` }}>
                {config.featuresLayout === 'accordion' ? (
                    <div className="max-w-3xl mx-auto space-y-4">
                        {config.features.map((feature) => (
                            <details key={feature.id} className="group border-b border-black/10 pb-4">
                                <summary className={`list-none flex justify-between items-center cursor-pointer text-xl font-medium ${fontClass}`}>
                                    <div className="flex items-center gap-3">
                                        {feature.image && (
                                            <div className="w-10 h-10 rounded overflow-hidden bg-gray-50 flex-shrink-0">
                                                <img src={feature.image} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        {feature.title}
                                    </div>
                                    <span className="transform group-open:rotate-180 transition-transform">
                                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </summary>
                                <p className={`mt-4 opacity-70 leading-relaxed ${sansClass} pl-14`}>
                                    {feature.description}
                                </p>
                            </details>
                        ))}
                    </div>
                ) : config.featuresLayout === 'list' ? (
                    <div className="max-w-3xl mx-auto space-y-12">
                        {config.features.map((feature) => (
                            <div key={feature.id} className="flex gap-6 items-start">
                                {feature.image && (
                                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                                        <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div>
                                    <h3 className={`text-2xl font-medium mb-2 ${fontClass}`}>
                                        {feature.title}
                                    </h3>
                                    <p className={`opacity-70 leading-relaxed text-base ${sansClass}`}>
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Default Grid
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                        {config.features.map((feature) => (
                            <div key={feature.id} className="flex flex-col gap-4">
                                {feature.image && (
                                    <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-2 bg-gray-50">
                                        <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="w-12 h-0.5 mb-2 opacity-50" style={{ backgroundColor: primaryColor }}></div>
                                <h3 className={`text-xl font-medium ${fontClass}`}>
                                    {feature.title}
                                </h3>
                                <p className={`opacity-70 leading-relaxed text-sm ${sansClass}`}>
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Additional Content Sections */}
            {config.contentSections.map((section) => {
                const paddingClass = {
                    'small': 'px-4 md:px-12',
                    'medium': 'px-6 md:px-24',
                    'large': 'px-8 md:px-48'
                }[section.paddingX || 'medium'];

                return (
                    <section
                        key={section.id}
                        id={section.id}
                        className={`${paddingClass} py-16 md:py-24 border-t border-black/5 scroll-mt-20`}
                        style={{ borderColor: `${textColor}10` }}
                    >
                        <div className={section.layout === 'split' ? "max-w-7xl mx-auto" : "max-w-3xl mx-auto"}>
                            {section.type === 'accordion' && section.items ? (
                                section.layout === 'split' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                                        <div className="md:col-span-4">
                                            {section.title && (
                                                <h2 className={`text-3xl font-medium mb-6 ${fontClass} text-left`}>
                                                    {section.title}
                                                </h2>
                                            )}
                                        </div>
                                        <div className="md:col-span-8 space-y-4">
                                            {section.items.map((item) => (
                                                <details key={item.id} className="group border-b border-black/10 pb-4">
                                                    <summary className={`list-none flex justify-between items-center cursor-pointer text-lg font-medium ${sansClass}`}>
                                                        {item.question}
                                                        <span className="transform group-open:rotate-180 transition-transform">
                                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </span>
                                                    </summary>
                                                    <p className={`mt-4 opacity-70 leading-relaxed ${sansClass}`}>
                                                        {item.answer}
                                                    </p>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {section.title && (
                                            <h2 className={`text-3xl font-medium mb-12 text-center ${fontClass}`}>
                                                {section.title}
                                            </h2>
                                        )}
                                        <div className="space-y-4">
                                            {section.items.map((item) => (
                                                <details key={item.id} className="group border-b border-black/10 pb-4">
                                                    <summary className={`list-none flex justify-between items-center cursor-pointer text-lg font-medium ${sansClass}`}>
                                                        {item.question}
                                                        <span className="transform group-open:rotate-180 transition-transform">
                                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </span>
                                                    </summary>
                                                    <p className={`mt-4 opacity-70 leading-relaxed ${sansClass}`}>
                                                        {item.answer}
                                                    </p>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="text-center">
                                    {section.title && (
                                        <h2 className={`text-3xl font-medium mb-8 ${fontClass}`}>
                                            {section.title}
                                        </h2>
                                    )}
                                    <div className={`opacity-80 leading-relaxed whitespace-pre-wrap ${sansClass}`}>
                                        {section.content}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                );
            })}

            {/* Footer Form Section (Optional/Alternative to Modal) */}
            <section id="form" className="px-6 py-20 md:py-32 bg-opacity-5 scroll-mt-20" style={{ backgroundColor: `${primaryColor}10` }}>
                <div className="max-w-md mx-auto text-center">
                    <h2 className={`text-3xl font-medium mb-4 ${fontClass}`}>
                        {config.form.title}
                    </h2>
                    <p className={`mb-8 opacity-70 ${sansClass}`}>
                        {config.form.description}
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full py-3 px-6 text-white font-medium tracking-wide transition-all hover:opacity-90 active:scale-[0.98] flex justify-center items-center gap-2 rounded-md shadow-md"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {config.hero.ctaText || "Join the Waitlist"}
                    </button>
                </div>
            </section>

            <footer className={`py-12 text-left px-6 opacity-40 text-sm border-t border-black/5 ${sansClass}`} style={{ borderColor: `${textColor}10` }}>
                © {new Date().getFullYear()} {config.header.logoText} All rights reserved.
            </footer>
        </div>
    );
};