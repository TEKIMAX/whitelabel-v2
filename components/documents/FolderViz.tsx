import React from 'react';
import { FolderOpen, FileText } from 'lucide-react';

export const FolderViz: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <style>{`
        @keyframes float-in {
          0% {
            opacity: 0;
            transform: translate(100px, -100px) scale(0.8) rotate(10deg);
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(0, 20px) scale(0.5);
          }
        }
        
        .doc-anim {
          animation: float-in 4s infinite ease-in-out;
          position: absolute;
          opacity: 0;
        }
        
        .doc-anim:nth-child(1) { animation-delay: 0s; right: -20px; top: -40px; }
        .doc-anim:nth-child(2) { animation-delay: 1.3s; right: -40px; top: 0px; }
        .doc-anim:nth-child(3) { animation-delay: 2.6s; right: 0px; top: -80px; }
      `}</style>

      {/* Main Folder Icon */}
      <div className="relative z-10">
        <div className="absolute inset-0 bg-nobel-gold/20 blur-2xl rounded-full scale-150"></div>
        <FolderOpen size={180} strokeWidth={1} className="text-nobel-dark drop-shadow-2xl relative z-10" />
        
        {/* Floating Documents */}
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
           <div className="doc-anim bg-white p-3 shadow-lg rounded border border-nobel-dark/5">
              <FileText size={32} className="text-nobel-gold" />
              <div className="h-1 w-8 bg-nobel-dark/10 mt-2 rounded"></div>
              <div className="h-1 w-6 bg-nobel-dark/10 mt-1 rounded"></div>
           </div>
           
           <div className="doc-anim bg-white p-3 shadow-lg rounded border border-nobel-dark/5" style={{ animationDelay: '1.3s', transform: 'translate(40px, -60px)' }}>
              <FileText size={32} className="text-nobel-dark" />
              <div className="h-1 w-8 bg-nobel-dark/10 mt-2 rounded"></div>
              <div className="h-1 w-6 bg-nobel-dark/10 mt-1 rounded"></div>
           </div>

           <div className="doc-anim bg-white p-3 shadow-lg rounded border border-nobel-dark/5" style={{ animationDelay: '2.6s', transform: 'translate(-30px, -50px)' }}>
              <FileText size={32} className="text-nobel-gold" />
              <div className="h-1 w-8 bg-nobel-dark/10 mt-2 rounded"></div>
              <div className="h-1 w-6 bg-nobel-dark/10 mt-1 rounded"></div>
           </div>
        </div>
      </div>
    </div>
  );
};