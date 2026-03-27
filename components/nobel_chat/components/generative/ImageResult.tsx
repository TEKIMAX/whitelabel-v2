
import React from 'react';
import { Download, Save } from 'lucide-react';

interface ImageResultProps {
  url: string | string[];
  prompt: string;
  isLogo?: boolean;
  onSave?: (content: string, type: 'image') => void;
}

const ImageFrame: React.FC<{ url: string, prompt: string, idx: number, isLogo?: boolean, onSave?: any }> = ({ url, prompt, idx, isLogo, onSave }) => {
  const [isLoading, setIsLoading] = React.useState(true);

  const handleDownload = (imgUrl: string) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = isLogo ? `nobel-logo-${idx + 1}.png` : 'nobel-generation.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow aspect-square flex items-center justify-center p-4">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-nobel-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={url}
        alt={`${prompt} - concept ${idx + 1}`}
        className={`max-w-full max-h-full object-contain ${isLogo ? '' : 'w-full h-full object-cover rounded-xl'} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
        onLoad={() => setIsLoading(false)}
      />
      {!isLoading && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={() => handleDownload(url)}
            className="bg-white text-nobel-dark p-2 rounded-full hover:scale-110 transition-transform mr-2"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          {onSave && (
            <button
              onClick={() => onSave(url, 'image', { tags: ['AI Assisted'] })}
              className="bg-white text-nobel-dark p-2 rounded-full hover:scale-110 transition-transform"
              title="Save to Project"
            >
              <Save className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const ImageResult: React.FC<ImageResultProps> = ({ url, prompt, isLogo, onSave }) => {
  const imageUrls = Array.isArray(url) ? url : [url];

  return (
    <div className="my-6 space-y-4">
      <div className={`grid gap-4 ${isLogo ? 'grid-cols-2 max-w-xl mx-auto' : 'grid-cols-1'}`}>
        {imageUrls.map((img, idx) => (
          <ImageFrame key={idx} url={img} prompt={prompt} idx={idx} isLogo={isLogo} onSave={onSave} />
        ))}
      </div>
      <div className="text-center px-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Concept Prompt</p>
        <p className="text-xs text-gray-500 italic max-w-md mx-auto">{prompt}</p>
      </div>
    </div>
  );
};

export default ImageResult;
