import React, { useState, useEffect } from 'react';
import { Youtube, Music, Copy } from 'lucide-react';
import { Button } from './ui/button';

interface PlatformLinksProps {
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  className?: string;
}

export function PlatformLinks({ youtubeUrl, spotifyUrl, className = '' }: PlatformLinksProps) {
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (copiedPlatform) {
      const timer = setTimeout(() => {
        setCopiedPlatform(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedPlatform]);

  const handleCopy = async (e: React.MouseEvent, url: string, platform: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPlatform(platform);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  if (!youtubeUrl && !spotifyUrl) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sm font-medium text-gray-500">Link</span>
      <div className="flex">
        {youtubeUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="flex px-1 items-left gap-1 text-red-300 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => handleCopy(e, youtubeUrl, 'YouTube')}
          >
            <Youtube className="h-4 w-4" />
            {copiedPlatform === 'YouTube' ? (
              <span className="text-xs">Copied</span>
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
        {spotifyUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="flex px-1 items-left gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={(e) => handleCopy(e, spotifyUrl, 'Spotify')}
          >
            <Music className="h-4 w-4" />
            {copiedPlatform === 'Spotify' ? (
              <span className="text-xs">Copied</span>
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
} 