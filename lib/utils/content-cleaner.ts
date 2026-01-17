import { Language } from '@/types';

/**
 * Clean up generated content: remove meta-commentary and asterisks
 */
export function cleanPostContent(content: string, language: Language): string {
  let cleaned = content;

  // Remove asterisks
  cleaned = cleaned.replace(/\*/g, '');

  // Remove meta-commentary patterns
  const lines = cleaned.split('\n');
  const cleanedLines: string[] = [];
  
  // Patterns to identify and remove meta-commentary lines
  const metaPatterns = language === 'kurdish' 
    ? [
        /^فەرموو[،,]/i,
        /^ئەمەش پۆستێکی/i,
        /^بەپێی داواکارییەکانت/i,
        /^بەپێی داواکاریەکانت/i,
        /^لەبەرگرتنەوەی/i,
        /^پۆستێکی LinkedIn/i,
        /نزیکەی \d+ پیت/i,
        /تێکەڵەیەکە لە/i,
      ]
    : [
        /^here'?s a linkedin post/i,
        /^based on your requirements/i,
        /^this is a linkedin post/i,
        /^here is a post/i,
        /^based on the context/i,
        /^following is a linkedin post/i,
        /approximately \d+ characters/i,
        /around \d+ words/i,
      ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Skip empty lines at the start
    if (cleanedLines.length === 0 && !trimmedLine) {
      continue;
    }
    
    // Check if line matches meta-commentary patterns
    const isMetaCommentary = metaPatterns.some(pattern => pattern.test(trimmedLine));
    
    // Also check if line contains colons followed by explanatory text (common in meta-commentary)
    const hasExplanatoryColon = trimmedLine.includes(':') && 
      (trimmedLine.toLowerCase().includes('post') || 
       trimmedLine.includes('پۆست') ||
       trimmedLine.includes('داواکاری') ||
       trimmedLine.includes('requirements'));
    
    if (!isMetaCommentary && !hasExplanatoryColon) {
      cleanedLines.push(line);
    }
  }

  cleaned = cleanedLines.join('\n').trim();

  // Remove any remaining asterisks (in case they were in the middle of lines)
  cleaned = cleaned.replace(/\*/g, '');

  return cleaned;
}

/**
 * Clean adapted content for cross-platform use
 */
export function cleanAdaptedContent(content: string, language: Language): string {
  let cleaned = content;

  // Remove meta-commentary patterns
  const lines = cleaned.split('\n');
  const cleanedLines: string[] = [];
  
  const metaPatterns = language === 'kurdish' 
    ? [
        /^پۆستێکی|^نموونە|^ئەمەش|^بەپێی/i,
      ]
    : [
        /^here'?s a|^this is a|^based on|^example/i,
      ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (cleanedLines.length === 0 && !trimmedLine) {
      continue;
    }
    
    const isMetaCommentary = metaPatterns.some(pattern => pattern.test(trimmedLine));
    
    if (!isMetaCommentary) {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n').trim();
}
