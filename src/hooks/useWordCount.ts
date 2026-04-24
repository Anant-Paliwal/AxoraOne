import { useState, useEffect } from 'react';

export interface WordCountStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  readingTime: number; // in minutes
}

export function useWordCount(content: string): WordCountStats {
  const [stats, setStats] = useState<WordCountStats>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    paragraphs: 0,
    readingTime: 0,
  });

  useEffect(() => {
    // Strip HTML tags
    const text = content.replace(/<[^>]*>/g, ' ').trim();
    
    // Count words
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Count characters
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    
    // Count paragraphs
    const paragraphs = content.split(/<\/p>|<br>/).filter(p => p.trim().length > 0).length;
    
    // Calculate reading time (average 200 words per minute)
    const readingTime = Math.ceil(words / 200);

    setStats({
      words,
      characters,
      charactersNoSpaces,
      paragraphs,
      readingTime,
    });
  }, [content]);

  return stats;
}
