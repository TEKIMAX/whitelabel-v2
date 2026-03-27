import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PitchDeckSlide } from '../../../../types';

interface PitchDeckProps {
  slides: PitchDeckSlide[];
}

const PitchDeck: React.FC<PitchDeckProps> = ({ slides = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!slides || slides.length === 0) {
    return (
      <div className="my-6 border border-nobel-gold/20 rounded-2xl p-8 bg-nobel-dark text-center animate-fade-in-up">
        <span className="text-nobel-gold animate-pulse text-xl">✦</span>
        <p className="text-gray-400 mt-2 text-sm">Generating deck strategy...</p>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="my-6 border border-nobel-gold/20 rounded-2xl overflow-hidden bg-nobel-dark shadow-xl animate-fade-in-up">
      <div className="flex items-center justify-between px-6 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-nobel-gold animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-nobel-gold/80">Strategy Deck</span>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>

      <div className="p-8 min-h-[300px] flex flex-col justify-center">
        <div className="space-y-4">
          <h3 className="text-3xl font-serif text-white leading-tight">
            {slide.title}
          </h3>
          <div className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {slide.content}
            </ReactMarkdown>
          </div>
          {slide.points && (
            <div className="grid grid-cols-1 gap-2 pt-4">
              {slide.points.map((pt, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <span className="text-nobel-gold text-xs">✦</span>
                  <span className="text-sm text-gray-300">{pt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 bg-white/5">
        <div className="flex gap-1">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-6 bg-nobel-gold' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 transition-all"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlide === slides.length - 1}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 transition-all"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PitchDeck;
