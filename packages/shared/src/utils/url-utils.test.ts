import { extractYouTubeVideoId, isYouTubeUrl, buildYouTubeUrl } from './url-utils';

describe('URL Utilities', () => {
  describe('extractYouTubeVideoId', () => {
    const videoId = 'dQw4w9WgXcQ'; // Famous video ID for testing
    
    test('extracts video ID from standard watch URL', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`http://www.youtube.com/watch?v=${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`https://youtube.com/watch?v=${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`http://youtube.com/watch?v=${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`youtube.com/watch?v=${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`www.youtube.com/watch?v=${videoId}`)).toBe(videoId);
    });

    test('extracts video ID from shortened URL', () => {
      expect(extractYouTubeVideoId(`https://youtu.be/${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`http://youtu.be/${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`youtu.be/${videoId}`)).toBe(videoId);
    });

    test('extracts video ID from embed URL', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`http://www.youtube.com/embed/${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`youtube.com/embed/${videoId}`)).toBe(videoId);
    });

    test('extracts video ID from shorts URL', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`http://www.youtube.com/shorts/${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`youtube.com/shorts/${videoId}`)).toBe(videoId);
    });

    test('extracts video ID from legacy URL', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/v/${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`http://www.youtube.com/v/${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`youtube.com/v/${videoId}`)).toBe(videoId);
    });

    test('extracts video ID from screening room URL', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/ytscreeningroom?v=${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`http://www.youtube.com/ytscreeningroom?v=${videoId}`)).toBe(videoId);
      expect(extractYouTubeVideoId(`youtube.com/ytscreeningroom?v=${videoId}`)).toBe(videoId);
    });

    test('handles URLs with additional parameters', () => {
      expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${videoId}&t=42s`)).toBe(videoId);
      expect(extractYouTubeVideoId(`https://youtu.be/${videoId}?t=42s`)).toBe(videoId);
    });

    test('returns null for invalid URLs', () => {
      expect(extractYouTubeVideoId('https://example.com')).toBeNull();
      expect(extractYouTubeVideoId('not a url')).toBeNull();
      expect(extractYouTubeVideoId('')).toBeNull();
    });

    test('returns null for malformed YouTube URLs', () => {
      expect(extractYouTubeVideoId('https://youtube.com/watch')).toBeNull();
      expect(extractYouTubeVideoId('https://youtube.com/shorts/')).toBeNull();
      expect(extractYouTubeVideoId('https://youtu.be/')).toBeNull();
    });
  });

  describe('isYouTubeUrl', () => {
    test('returns true for valid YouTube URLs', () => {
      expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    });

    test('returns false for invalid URLs', () => {
      expect(isYouTubeUrl('https://example.com')).toBe(false);
      expect(isYouTubeUrl('not a url')).toBe(false);
      expect(isYouTubeUrl('')).toBe(false);
    });
  });

  describe('buildYouTubeUrl', () => {
    test('builds correct YouTube watch URL', () => {
      const videoId = 'dQw4w9WgXcQ';
      expect(buildYouTubeUrl(videoId)).toBe(`https://www.youtube.com/watch?v=${videoId}`);
    });
  });
}); 