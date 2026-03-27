import React from 'react';
import { CanvasData, CanvasSection } from './types';
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import MiniEditor from '../editor/MiniEditor';
import AttributionBadge from '../AttributionBadge';

interface BusinessModelCanvasProps {
  data: CanvasData;
  onUpdate: (id: string, newContent: string) => void;
  disabled?: boolean; // New prop
  onNavigateToCanvas?: () => void; // New prop for navigation
}

const BusinessModelCanvas: React.FC<BusinessModelCanvasProps> = ({ data, onUpdate, disabled = false, onNavigateToCanvas }) => {
  // Mock AI Generation for now - replace with actual API call
  const handleGenerateSection = async (sectionId: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const placeholders: Record<string, string> = {
      problem: "The market lacks a comprehensive solution for...",
      solution: "Our platform provides an AI-driven approach to...",
      customerSegments: "Tech-savvy founders, early-stage startups...",
      uniqueValueProposition: "The only all-in-one workspace that...",
    };

    const field = Object.keys(placeholders).find(k => sectionId.toLowerCase().includes(k.toLowerCase())) || "problem";
    const text = placeholders[field] || "AI Generated content...";

    // We used to append text manually via onUpdate, but MiniEditor likely handles the return value.
    // However, if MiniEditor *only* returns the string to be used, we might rely on that.
    // To match Promise<string> we must return string.
    return text;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-nobel-gold/20 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-serif font-bold text-nobel-dark mb-2">Business Model Canvas</h2>
            <p className="text-gray-600">
              {disabled
                ? "This view is read-only. To edit your Business Model Canvas, please visit the Canvas page."
                : "Fill out the building blocks of your business below. This information can be used to auto-generate sections of your business plan."}
            </p>
          </div>
          {disabled && onNavigateToCanvas && (
            <button
              onClick={onNavigateToCanvas}
              className="flex items-center gap-2 px-4 py-2 bg-nobel-dark text-white rounded-lg hover:bg-nobel-dark/90 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <ChevronRight size={16} />
              Go to Canvas Page
            </button>
          )}
        </div>
      </div>

      {data.map((section) => (
        <details key={section.id} className="group bg-white rounded-lg border border-gray-200 open:shadow-md transition-all duration-200">
          <summary className="flex items-center justify-between cursor-pointer p-4 select-none list-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-nobel-cream rounded-md text-nobel-gold group-open:bg-nobel-gold group-open:text-white transition-colors">
                <div className="font-bold text-sm w-4 h-4 flex items-center justify-center">{section.id.charAt(0).toUpperCase()}</div>
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-nobel-dark flex items-center gap-2">
                  {section.title}
                </h3>
              </div>
            </div>
            <div className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              <ChevronDown size={20} />
            </div>
          </summary>

          <div className="px-6 pb-6 pt-2 border-t border-gray-100">
            <div className="flex items-start gap-2 mb-3 text-sm text-nobel-dim italic">
              <HelpCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{section.description}</p>
            </div>
            {/* Show valid content or placeholder if empty */}
            {disabled ? (
              section.content ? (
                <div className="prose prose-sm max-w-none text-gray-700 p-3 bg-gray-50 rounded-md border border-gray-200 min-h-[60px]">
                  <Markdown
                    components={{
                      img: ({ alt, src }) => {
                        if (alt === 'AI Assisted') return <AttributionBadge type="AI Assisted" />;
                        if (alt === 'Human Edited') return <AttributionBadge type="Human Edited" />;
                        return <img alt={alt} src={src} />;
                      }
                    }}
                  >
                    {section.content}
                  </Markdown>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-md border border-dashed border-gray-300 text-gray-400 text-center italic text-sm">
                  No content yet. Go to the Canvas page to add details.
                </div>
              )
            ) : (
              <MiniEditor
                content={section.content}
                onUpdate={(newContent) => onUpdate(section.id, newContent)}
                placeholder={`Enter your ${section.title.toLowerCase()} details here...`}
                onGenerateAI={() => handleGenerateSection(section.id)}
              />
            )}
          </div>
        </details>
      ))}
    </div>
  );
};

export default BusinessModelCanvas;
