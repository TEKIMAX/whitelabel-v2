import React, { useState, useEffect } from 'react';
import { Zap, Users, ArrowRight, ShieldCheck, Target, Rocket, Globe, Menu, X, MessageSquare, ExternalLink, Activity, Briefcase, Mail, Send } from 'lucide-react';
import { Logo } from './Logo';
import { Helmet as BaseHelmet } from 'react-helmet-async';
const Helmet = BaseHelmet as any;

interface LandingPageProps {
   onLogin: () => void;
}

const TOTAL_SLIDES = 7;

const slideMeta = [
   { label: 'Home', title: 'The Operating System for 0 to 1.' },
   { label: 'The Problem', title: 'Building is faster than ever.' },
   { label: 'Features', title: 'Deep collaboration.' },
   { label: 'Platform', title: 'Built for Programs.' },
   { label: 'Impact', title: 'Empowering Veterans.' },
   { label: 'Mission', title: 'Empowering the Founders.' },
   { label: 'Contact', title: 'Get in Touch.' },
];

const features = [
   {
      id: 'research',
      title: 'Research Hub',
      desc: 'AI-powered market intelligence and validation.',
      longDesc: 'Comprehensive market research suite with autonomous agents that calculate TAM, SAM, and SOM using real data. Includes competitive matrix analysis, customer discovery tools, and interactive Business Model Canvas.',
      image: '/images/Cozy.png',
      align: 'object-center',
      details: [
         'Top-Down & Bottom-Up Sizing',
         'Competitive Matrix',
         'Customer Discovery',
         'Business Model Canvas'
      ]
   },
   {
      id: 'strategy',
      title: 'Strategy & Planning',
      desc: 'Goals, roadmaps, and business plan builder.',
      longDesc: 'Set strategic goals and objectives, build investor-ready business plans, and track your startup journey milestones — all connected to your AI context for adaptive recommendations.',
      image: '/images/hero-carousel-1.png',
      align: 'object-center',
      details: [
         'Goals & Objectives',
         'Business Plan Builder',
         'Startup Journey Tracker',
         'Calendar & Milestones'
      ]
   },
   {
      id: 'operations',
      title: 'Operations',
      desc: 'Team management, files, and priority execution.',
      longDesc: 'Manage your founding team roles, organize files and assets, prioritize tasks with an Eisenhower Matrix, and keep all legal documents in one secure workspace.',
      image: '/images/working_women.png',
      align: 'object-top',
      details: [
         'Priority Matrix',
         'Team & Roles',
         'Files & Assets',
         'Document Management'
      ]
   },
   {
      id: 'ai',
      title: 'Adaptive AI Engine',
      desc: 'Context-aware AI with human-AI cooperation tracking.',
      longDesc: 'The Adaptive Engine lives inside your project — it understands your documents, market data, and strategic decisions. A Cooperation Report tracks the ratio of AI-generated vs human-authored content, providing full transparency and audit trails across your entire entrepreneurial journey.',
      image: '/images/milad-fakurian-F4qy_1tAFfs-unsplash.jpg',
      align: 'object-center',
      details: [
         'Project-Aware AI Chat',
         'Human-AI Cooperation Report',
         'AI vs Human Ratio Tracking',
         'Audit Trail & Sign-offs'
      ]
   }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
   const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://adaptivestartup.io';
   const [currentSlide, setCurrentSlide] = useState(0);
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const [selectedFeature, setSelectedFeature] = useState<typeof features[0] | null>(features[0]);
   const [contactForm, setContactForm] = useState({ name: '', email: '', inquiry: '', message: '' });
   const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

   const containerVariants = {
      hidden: { opacity: 0, x: 20 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
      exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
   };

   const handleContactSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setContactStatus('sending');
      try {
         const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactForm),
         });
         if (res.ok) {
            setContactStatus('sent');
            setContactForm({ name: '', email: '', inquiry: '', message: '' });
         } else {
            setContactStatus('error');
         }
      } catch {
         setContactStatus('error');
      }
   };

   // Right-column images per slide
   const slideImages = [
      '/images/hero-logo.png',
      '/images/Cozy.png',
      '/images/milad-fakurian-F4qy_1tAFfs-unsplash.jpg',
      '/images/hero-carousel-2.png',
      '/images/veteran-founders.png',
      '/images/IMG_0953.JPG',
      '/images/ManTypingbyWindow.png',
   ];

   const slideImageStyles: Record<number, string> = {
      0: 'object-contain p-12',
      1: 'object-cover',
      2: 'object-cover',
      3: 'object-cover',
      4: 'object-cover object-top',
      5: 'object-cover object-[20%_center]',
      6: 'object-cover object-[20%_center]',
   };

   return (
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-stone-900 text-white relative overflow-y-auto md:overflow-hidden">
         <Helmet>
            <title>Adaptive Startup | AI-Powered Guidance for Early-Stage Founders</title>
            <meta name="description" content="Turn chaos into clarity with AI. Adaptive Startup helps early-stage founders navigate their entrepreneurial journey - from first idea to funded startup." />
            <meta name="keywords" content="startup, founder, AI assistant, early-stage, business plan, lean canvas, market research" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={siteUrl} />
            <meta property="og:title" content="Adaptive Startup | Turn Chaos Into Clarity" />
            <meta property="og:description" content="AI-powered guidance for early-stage founders. Turn chaos into clarity - from first idea to funded startup." />
            <meta property="og:image" content={`${siteUrl}/images/onboarding-cover.png`} />
         </Helmet>

         {/* Logo - Top Left */}
         <div className="absolute top-8 left-8 md:left-16 z-30">
            <Logo className="flex items-center gap-3" imageClassName={`h-16 w-auto rounded transition-all duration-300 ${currentSlide === 1 ? 'brightness-0 invert' : ''}`} textClassName="font-serif font-bold text-xl tracking-wide text-white" src="/images/black-logo.png" />
         </div>

         {/* Navigation - Top Right (Desktop Only) */}
         <div className="absolute top-8 right-8 z-30 hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-5 px-5 py-2.5 rounded-full bg-stone-900/70 backdrop-blur-md border border-white/10">
               {slideMeta.map((page, i) => (
                  <button
                     key={i}
                     onClick={() => setCurrentSlide(i)}
                     className={`relative text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-200 pb-1 group ${currentSlide === i
                        ? 'text-[#C5A065]'
                        : 'text-white/70 hover:text-white'
                        }`}
                  >
                     {page.label}
                     <span className={`absolute bottom-0 left-0 h-[2px] bg-[#C5A065] transition-all duration-300 ${currentSlide === i
                        ? 'w-full'
                        : 'w-0 group-hover:w-full'
                        }`} />
                  </button>
               ))}
            </nav>
         </div>

         {/* Mobile Hamburger Menu */}
         <div className="absolute top-8 right-8 z-30 md:hidden">
            <button
               onClick={() => setIsMobileMenuOpen(true)}
               className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex flex-col items-center justify-center gap-1.5 backdrop-blur-sm border border-white/10 transition-colors"
            >
               <div className="w-5 h-0.5 bg-white"></div>
               <div className="w-5 h-0.5 bg-white"></div>
               <div className="w-5 h-0.5 bg-white"></div>
            </button>
         </div>

         {/* Mobile Side Menu Panel */}
         {isMobileMenuOpen && (
            <>
               <div
                  className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden"
                  onClick={() => setIsMobileMenuOpen(false)}
               />
               <div className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-sm bg-stone-900 border-l border-white/10 p-6 overflow-y-auto md:hidden shadow-2xl">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="text-xl font-bold text-white uppercase tracking-widest">Menu</h3>
                     <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 text-white/50 hover:text-white transition-colors"
                     >
                        <X className="w-6 h-6" />
                     </button>
                  </div>
                  <div className="space-y-4">
                     {slideMeta.map((slide, i) => (
                        <button
                           key={i}
                           onClick={() => { setCurrentSlide(i); setIsMobileMenuOpen(false); }}
                           className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${currentSlide === i
                              ? 'bg-[#C5A065]/10 border-[#C5A065] text-white font-bold'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                              }`}
                        >
                           <span className="text-sm tracking-widest uppercase">{String(i + 1).padStart(2, '0')}. {slide.label}</span>
                        </button>
                     ))}
                  </div>
               </div>
            </>
         )}

         {/* Left Column: Content */}
         <div
            className={`w-full md:flex-1 relative flex flex-col justify-center p-8 md:p-24 z-10 min-h-[60vh] md:h-screen md:overflow-y-auto pb-32 md:pb-24 border-r custom-scrollbar transition-colors duration-500 ${
               currentSlide === 1
                  ? 'bg-stone-900 border-white/[0.06]'
                  : 'bg-[#F9F8F4] border-stone-200/30'
            }`}
            style={{
               transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
               backgroundImage: currentSlide === 1
                  ? 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)'
                  : 'linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)',
               backgroundSize: '100% 4px, 200px 100%'
            }}
         >
            {/* --- SLIDE 0: HERO --- */}
            {currentSlide === 0 && (
               <div className="relative z-10 max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Logo — large */}
                  <div className="-mb-24 mt-24 md:mt-0">
                     <img src="/images/hero-logo.png" alt="Adaptive Startup" className="h-72 md:h-96 w-auto" />
                  </div>



                  <div className="h-px w-24 bg-[#C5A065]/30 hidden md:block mb-6"></div>

                  <div className="space-y-4 text-stone-600 font-light leading-relaxed mb-12 text-sm max-w-lg">
                     <p>
                        Validate your market, audit your strategy, and execute your vision with <strong className="text-stone-900">context-aware AI</strong>. A unified workspace for early-stage founders — your portable portfolio that grows with your venture.
                     </p>
                     <p>
                        From <strong className="text-stone-900">AI-driven market research</strong> and <strong className="text-stone-900">competitor intelligence</strong> to <strong className="text-stone-900">business model canvases</strong> and <strong className="text-stone-900">clear audit trails of AI vs human-generated content</strong> — a single source of truth for every document, insight, and milestone across your entire entrepreneurial journey.
                     </p>
                  </div>

                  <div className="h-px w-full bg-stone-200 mb-8" />

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                     <button
                        onClick={() => setCurrentSlide(1)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-[#C5A065] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                     >
                        <span>Explore</span>
                        <ArrowRight className="w-4 h-4" />
                     </button>
                     <button
                        onClick={() => setCurrentSlide(3)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A065] text-stone-900 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-[#d4af74] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                     >
                        <span>Launch Your Whitelabel</span>
                        <ArrowRight className="w-4 h-4" />
                     </button>
                     {import.meta.env.DEV && (
                        <button
                           onClick={onLogin}
                           className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#C5A065]/50 text-[#C5A065] rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-[#C5A065]/10 transition-all"
                        >
                           <span>Sign In (Dev)</span>
                        </button>
                     )}
                  </div>

                  {/* Slide indicator */}
                  <div className="flex items-center gap-2 mt-12">
                     <span className="text-stone-400 text-[10px] font-bold tracking-widest uppercase">01 / {String(TOTAL_SLIDES).padStart(2, '0')}</span>
                  </div>
               </div>
            )}

            {/* --- SLIDE 1: THE PROBLEM --- */}
            {currentSlide === 1 && (
               <div className="relative z-10 max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-6 mt-24 md:mt-0">
                     <span className="w-1.5 h-1.5 rounded-full bg-[#C5A065] animate-pulse"></span>
                     <span className="text-xs font-bold tracking-widest text-[#C5A065] uppercase">The Reality</span>
                  </div>

                  <h2 className="font-serif text-3xl md:text-5xl text-white mb-6 leading-tight font-bold">
                     Building is faster than ever. <br />
                     <span className="text-stone-500">But clarity is harder to find.</span>
                  </h2>

                  <div className="space-y-4 text-white/70 font-light leading-relaxed text-sm max-w-lg mb-8">
                     <p>
                        AI has made creation accessible to everyone. You can ship code or design a product in seconds. But speed without strategy creates noise.
                     </p>
                     <p>
                        With <strong className="text-white">72.9 million independent workers in 2025</strong> in the US alone and a massive influx of AI-first companies, the market is crowded. Founders remain stuck in a loop of endless iteration without validation.
                     </p>
                  </div>

                  <div className="h-px w-full bg-white/[0.06] mb-8" />

                  <div className="flex flex-col sm:flex-row gap-8">
                     <div>
                        <div className="text-3xl font-serif text-white mb-1">72.9 M</div>
                        <div className="text-xs text-stone-500 uppercase tracking-widest mb-1">Total Independents (2025)</div>
                        <a href="https://www.mbopartners.com/state-of-independence/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#C5A065]/10 text-[#C5A065] border border-[#C5A065]/20 hover:bg-[#C5A065]/20 transition-colors">
                           Source: MBO Partners
                           <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                     </div>
                     <div>
                        <div className="text-3xl font-serif text-white mb-1">42%</div>
                        <div className="text-xs text-stone-500 uppercase tracking-widest mb-1">AI Startup Growth</div>
                        <a href="https://stripe.com/blog/stripe-atlas-startups-in-2025-year-in-review" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#C5A065]/10 text-[#C5A065] border border-[#C5A065]/20 hover:bg-[#C5A065]/20 transition-colors">
                           Source: Stripe Atlas
                           <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                     </div>
                  </div>

                  {/* Slide indicator */}
                  <div className="flex items-center gap-2 mt-12">
                     <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">02 / {String(TOTAL_SLIDES).padStart(2, '0')}</span>
                  </div>
               </div>
            )}

            {/* --- SLIDE 2: CO-ADAPTIVE SYSTEM / FEATURES --- */}
            {currentSlide === 2 && (
               <div className="relative z-10 max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-6 mt-24 md:mt-0">
                     <Zap className="w-4 h-4 text-[#C5A065]" />
                     <span className="text-xs font-bold tracking-widest text-[#C5A065] uppercase">Features</span>
                  </div>

                  <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-6 leading-tight font-bold">
                     Human + AI. <br />
                     <span className="text-[#C5A065]">In Unison.</span>
                  </h2>

                  <p className="text-stone-600 font-light leading-relaxed text-sm max-w-lg mb-8">
                     A true Co-Adaptive System where human creativity and AI intelligence work together. The engine learns from your strategic decisions while ensuring integrity through human-driven audit trails.
                  </p>

                  <div className="h-px w-full bg-stone-200 mb-6" />

                  <div className="space-y-3">
                     {features.map((feature, i) => (
                        <div
                           key={feature.id}
                           onClick={() => setSelectedFeature(selectedFeature?.id === feature.id ? null : feature)}
                           className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 ${selectedFeature?.id === feature.id
                              ? 'bg-[#C5A065]/10 border-[#C5A065]/40'
                              : 'bg-stone-100/50 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                              }`}
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <span className="text-stone-500 font-mono text-xs">{String(i).padStart(2, '0')}</span>
                                 <h3 className={`font-bold text-sm uppercase tracking-wider transition-colors ${selectedFeature?.id === feature.id ? 'text-[#C5A065]' : 'text-stone-800'}`}>
                                    {feature.title}
                                 </h3>
                              </div>
                              <ArrowRight className={`w-4 h-4 transition-transform ${selectedFeature?.id === feature.id ? 'rotate-90 text-[#C5A065]' : 'text-stone-400'}`} />
                           </div>
                           {selectedFeature?.id === feature.id && (
                              <div className="mt-3 pt-3 border-t border-stone-200">
                                 <p className="text-stone-500 text-xs leading-relaxed mb-3">{feature.longDesc}</p>
                                 <div className="flex flex-wrap gap-2">
                                    {feature.details.map((detail, idx) => (
                                       <span key={idx} className="px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-[10px] font-bold tracking-wider border border-stone-200">
                                          {detail}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     ))}
                  </div>

                  <div className="flex items-center gap-2 mt-12">
                     <span className="text-stone-400 text-[10px] font-bold tracking-widest uppercase">03 / {String(TOTAL_SLIDES).padStart(2, '0')}</span>
                  </div>
               </div>
            )}

            {/* --- SLIDE 3: WHITELABEL PLATFORM --- */}
            {currentSlide === 3 && (
               <div className="relative z-10 max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-6 mt-24 md:mt-0">
                     <Globe className="w-4 h-4 text-[#C5A065]" />
                     <span className="text-xs font-bold tracking-widest text-[#C5A065] uppercase">Whitelabel Platform</span>
                  </div>

                  <h2 className="font-serif text-3xl md:text-5xl text-stone-900 mb-6 leading-tight font-bold">
                     Built for <span className="text-[#C5A065]">Programs.</span><br />
                     <span className="text-stone-400">Branded as Yours.</span>
                  </h2>

                  <p className="text-stone-600 font-light leading-relaxed text-sm max-w-lg mb-8">
                     Adaptive Startup is designed to power the organizations that support founders. Deploy a fully branded instance of the platform under your own brand — your logo, your colors, your content.
                  </p>

                  <div className="h-px w-full bg-stone-200 mb-6" />

                  <div className="space-y-3">
                     <div className="p-4 border border-stone-200 bg-stone-100/50 rounded-lg flex items-center gap-4">
                        <div className="p-2 bg-[#C5A065]/10 border border-[#C5A065]/20 shrink-0">
                           <Briefcase className="w-4 h-4 text-[#C5A065]" />
                        </div>
                        <div>
                           <h4 className="font-bold text-stone-900 text-sm">Incubators & Accelerators</h4>
                           <p className="text-xs text-stone-500 font-light">Provide cohort founders with AI-powered workspaces from day one.</p>
                        </div>
                     </div>

                     <div className="p-4 border border-stone-200 bg-stone-100/50 rounded-lg flex items-center gap-4">
                        <div className="p-2 bg-stone-200 border border-stone-300 shrink-0">
                           <Users className="w-4 h-4 text-stone-600" />
                        </div>
                        <div>
                           <h4 className="font-bold text-stone-900 text-sm">Schools & Entrepreneurship Programs</h4>
                           <p className="text-xs text-stone-500 font-light">Equip students with real startup tools — not just theory.</p>
                        </div>
                     </div>

                     <div className="p-4 border border-[#C5A065]/20 bg-[#C5A065]/5 rounded-lg flex items-center gap-4">
                        <div className="p-2 bg-[#C5A065]/10 border border-[#C5A065]/20 shrink-0">
                           <Zap className="w-4 h-4 text-[#C5A065]" />
                        </div>
                        <div>
                           <h4 className="font-bold text-[#C5A065] text-sm">Coming Soon — B2C SaaS</h4>
                           <p className="text-xs text-stone-500 font-light">Direct-to-founder access, launching soon.</p>
                        </div>
                     </div>
                  </div>

                  <div className="mt-8">
                     <a
                        href="https://whitelabel.tekimax.ai/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A065] text-stone-900 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-[#d4af74] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                     >
                        <span>Launch Your Whitelabel</span>
                        <ArrowRight className="w-4 h-4" />
                     </a>
                  </div>

                  <div className="flex items-center gap-2 mt-12">
                     <span className="text-stone-400 text-[10px] font-bold tracking-widest uppercase">04 / {String(TOTAL_SLIDES).padStart(2, '0')}</span>
                  </div>
               </div>
            )}

            {/* --- SLIDE 4: IMPACT / VETERANS --- */}
            {currentSlide === 4 && (
               <div className="relative z-10 max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-6 mt-24 md:mt-0">
                     <Users className="w-4 h-4 text-[#C5A065]" />
                     <span className="text-xs font-bold tracking-widest text-[#C5A065] uppercase">Impact — Supporting Our Veterans and Their Families</span>
                  </div>

                  <h2 className="font-serif text-3xl md:text-5xl text-stone-900 mb-6 leading-tight font-bold">
                     Empowering <span className="text-[#C5A065]">Veterans</span>,{' '}
                     <span className="text-[#C5A065]">Military Families</span>, and{' '}
                     <span className="text-stone-400">Every Founder.</span>
                  </h2>

                  <div className="space-y-4 text-stone-600 font-light leading-relaxed text-sm max-w-lg mb-8">
                     <p>
                        The military community is forged in discipline, resilience, and strategic execution: traits that define <strong className="text-stone-900">Startup Success.</strong>
                     </p>
                     <p>
                        Whether you are transitioning from service, a military spouse navigating the uncertainty of service life, or an entrepreneur from any walk of life, we are building this platform to passionately support your journey.
                     </p>
                     <p>
                        Our commitment is to empower those who have served to become industry-defining founders, while providing every builder the tools to turn raw ambition into market reality.
                     </p>
                  </div>

                  <div className="h-px w-full bg-stone-200 mb-6" />

                  <div className="flex items-center gap-4 p-4 rounded-lg bg-[#C5A065]/10 border border-[#C5A065]/30">
                     <ShieldCheck className="w-8 h-8 text-[#C5A065]" />
                     <div>
                        <p className="text-sm font-bold text-[#C5A065] uppercase tracking-widest">30% Off for Veterans & Military Families</p>
                        <p className="text-xs text-stone-600">Service members, veterans, and their families receive 30% off all plans.</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-2 mt-12">
                     <span className="text-stone-400 text-[10px] font-bold tracking-widest uppercase">05 / {String(TOTAL_SLIDES).padStart(2, '0')}</span>
                  </div>
               </div>
            )}

            {/* --- SLIDE 5: MISSION --- */}
            {currentSlide === 5 && (
               <div className="relative z-10 max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-6 mt-24 md:mt-0">
                     <span className="w-1.5 h-1.5 rounded-full bg-stone-900"></span>
                     <span className="text-xs font-bold tracking-widest text-stone-500 uppercase">Our Mission</span>
                  </div>

                  <span className="block text-stone-500 text-sm font-bold uppercase tracking-[0.2em] mb-4">The New Industrial Revolution</span>
                  <h2 className="font-serif text-3xl md:text-5xl text-stone-900 mb-8 leading-tight font-bold">
                     Empowering the <br /> <span className="text-[#C5A065] italic">Founders.</span>
                  </h2>

                  <div className="space-y-4 text-stone-600 font-light leading-relaxed text-sm max-w-lg mb-8">
                     <p>
                        True economic power doesn't come from "users." It comes from <strong className="text-stone-900">builders.</strong>
                     </p>
                     <p>
                        We exist to bridge the gap between raw ambition and market reality. Our mission is to arm the next generation of founders with the tools to master rigorous hypothesis validation, accelerating the translation of "what if" into "what is."
                     </p>
                     <p>
                        In the age of AI, velocity is our greatest competitive advantage. We are building the operating system for the next tier of American industry.
                     </p>
                  </div>

                  <div className="h-px w-full bg-stone-200 mb-8" />

                  <div className="mt-8 text-[10px] text-stone-500">
                     <p>© {new Date().getFullYear()} Adaptive Startup. All rights reserved.</p>
                     <p className="mt-1 text-stone-600">Structure for the uncertainty of Day One.</p>
                  </div>

                  <div className="flex items-center gap-2 mt-8">
                     <span className="text-stone-400 text-[10px] font-bold tracking-widest uppercase">06 / {String(TOTAL_SLIDES).padStart(2, '0')}</span>
                  </div>
               </div>
            )}

            {/* --- SLIDE 6: CONTACT --- */}
            {currentSlide === 6 && (
               <div className="relative z-10 max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-6 mt-24 md:mt-0">
                     <Mail className="w-4 h-4 text-[#C5A065]" />
                     <span className="text-xs font-bold tracking-widest text-[#C5A065] uppercase">Contact Us</span>
                  </div>

                  <h2 className="font-serif text-3xl md:text-5xl text-stone-900 mb-4 leading-tight font-bold">
                     Get in <span className="text-[#C5A065]">Touch.</span>
                  </h2>

                  <p className="text-stone-600 font-light leading-relaxed text-sm max-w-lg mb-8">
                     Interested in partnering, deploying a whitelabel, or just want to learn more? Drop us a line.
                  </p>

                  <div className="h-px w-full bg-stone-200 mb-6" />

                  {contactStatus === 'sent' ? (
                     <div className="p-8 border border-[#C5A065]/30 bg-[#C5A065]/10 rounded-lg text-center">
                        <ShieldCheck className="w-8 h-8 text-[#C5A065] mx-auto mb-3" />
                        <p className="text-stone-900 font-bold text-sm mb-1">Message Sent!</p>
                        <p className="text-stone-500 text-xs">We'll get back to you shortly.</p>
                     </div>
                  ) : (
                     <form onSubmit={handleContactSubmit} className="space-y-4">
                        <div>
                           <input
                              type="text"
                              placeholder="Your Name"
                              required
                              value={contactForm.name}
                              onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-lg text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-[#C5A065]/50 transition-colors"
                           />
                        </div>
                        <div>
                           <input
                              type="email"
                              placeholder="Email Address"
                              required
                              value={contactForm.email}
                              onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-lg text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-[#C5A065]/50 transition-colors"
                           />
                        </div>
                        <div>
                           <select
                              required
                              value={contactForm.inquiry}
                              onChange={(e) => setContactForm(prev => ({ ...prev, inquiry: e.target.value }))}
                              className={`w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-[#C5A065]/50 transition-colors appearance-none cursor-pointer ${contactForm.inquiry ? 'text-stone-900' : 'text-stone-400'}`}
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                           >
                              <option value="" disabled>Select Inquiry Type</option>
                              <option value="whitelabel">Whitelabel Question</option>
                              <option value="demo">Request a Demo</option>
                           </select>
                        </div>
                        <div>
                           <textarea
                              placeholder="Your Message"
                              required
                              rows={4}
                              value={contactForm.message}
                              onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                              className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-lg text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-[#C5A065]/50 transition-colors resize-none"
                           />
                        </div>
                        <button
                           type="submit"
                           disabled={contactStatus === 'sending'}
                           className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A065] text-stone-900 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-[#d4af74] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
                        >
                           <span>{contactStatus === 'sending' ? 'Sending...' : 'Send Message'}</span>
                           <Send className="w-4 h-4" />
                        </button>
                        {contactStatus === 'error' && (
                           <p className="text-red-400 text-xs">Failed to send. Please try again.</p>
                        )}
                     </form>
                  )}

                  <div className="flex items-center gap-2 mt-12">
                     <span className="text-stone-400 text-[10px] font-bold tracking-widest uppercase">07 / {String(TOTAL_SLIDES).padStart(2, '0')}</span>
                  </div>
               </div>
            )}

            {/* Persistent Footer — Bottom Left */}
            <div className="absolute bottom-6 left-8 md:left-16 z-20">
               <div className={`text-[10px] ${currentSlide === 1 ? 'text-stone-500' : 'text-stone-600'}`}>
                  <p>© {new Date().getFullYear()} Adaptive Startup. All rights reserved.</p>
                  <p className={`mt-0.5 ${currentSlide === 1 ? 'text-stone-600' : 'text-stone-500'}`}>Structure for the uncertainty of Day One.</p>
               </div>
            </div>
         </div>

         {/* Right Column: Visual */}
         <div
            className="hidden md:block relative transition-all duration-700 ease-in-out"
            style={{ width: currentSlide === 0 ? '45%' : '35%' }}
         >
            <div className="absolute inset-0 overflow-hidden bg-stone-900">
               {currentSlide === 0 ? (
                  <video
                     autoPlay
                     muted
                     loop
                     playsInline
                     className="w-full h-full object-cover"
                  >
                     <source src="https://pub-f5878d4dcfa94dfb934126f0ecf7ceab.r2.dev/cover-video/The%20Art%20of%20Noticing%20General%20TikTok%20Video%20in%20Hook-driven%20Style.mp4" type="video/mp4" />
                  </video>
               ) : (
                  <img
                     key={currentSlide}
                     src={slideImages[currentSlide]}
                     alt={slideMeta[currentSlide].title}
                     className={`w-full h-full animate-in fade-in zoom-in-95 duration-700 ${slideImageStyles[currentSlide] || 'object-cover'}`}
                  />
               )}
               {/* Gradient overlay */}
               <div className="absolute inset-0 bg-gradient-to-r from-stone-900/60 via-stone-900/30 to-transparent pointer-events-none" />
               {currentSlide !== 0 && (
                  <div className="absolute inset-0 bg-[#C5A065]/5 mix-blend-overlay pointer-events-none" />
               )}
            </div>

            {/* Bottom-right title overlay (hero slide only) */}
            {currentSlide === 0 && (
               <div className="absolute bottom-8 right-8 left-8 z-10">
                  <h1 className="font-serif text-xl md:text-2xl text-white mb-2 leading-tight font-bold drop-shadow-lg">
                     The Operating System for <span className="text-[#C5A065]">0 to 1.</span>
                  </h1>
                  <p className="text-lg text-white/70 font-light drop-shadow-md">
                     Turn chaos into clarity.
                  </p>
               </div>
            )}
         </div>
      </div>
   );
};

export default LandingPage;
