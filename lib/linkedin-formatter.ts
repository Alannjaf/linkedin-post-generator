/**
 * LinkedIn Formatter Utility
 * 
 * Converts HTML content to LinkedIn-compatible format.
 * LinkedIn does NOT support HTML tags or Markdown syntax.
 * 
 * Supported conversions:
 * - Bold/Italic: Unicode characters (optional) or plain text
 * - Lists: Plain text with bullet characters (•) or numbers (1., 2., etc.)
 * - Line breaks: Preserved
 */

// Unicode character mappings for bold and italic
const BOLD_UNICODE_MAP: { [key: string]: string } = {
  'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛',
  'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣',
  'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫',
  'Y': '𝗬', 'Z': '𝗭',
  'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵',
  'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽',
  'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅',
  'y': '𝘆', 'z': '𝘇',
  '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵',
  ' ': ' ', '!': '!', '?': '?', '.': '.', ',': ',', ':': ':', ';': ';', '-': '-', '_': '_',
  '(': '(', ')': ')', '[': '[', ']': ']', '{': '{', '}': '}', '/': '/', '\\': '\\',
  '@': '@', '#': '#', '$': '$', '%': '%', '^': '^', '&': '&', '*': '*', '+': '+', '=': '=',
  '\'': '\'', '"': '"', '`': '`', '~': '~', '|': '|', '<': '<', '>': '>',
};

const ITALIC_UNICODE_MAP: { [key: string]: string } = {
  'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏',
  'I': '𝘐', 'J': '𝘑', 'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗',
  'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛', 'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟',
  'Y': '𝘠', 'Z': '𝘡',
  'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩',
  'i': '𝘪', 'j': '𝘫', 'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱',
  'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵', 'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹',
  'y': '𝘺', 'z': '𝘻',
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  ' ': ' ', '!': '!', '?': '?', '.': '.', ',': ',', ':': ':', ';': ';', '-': '-', '_': '_',
  '(': '(', ')': ')', '[': '[', ']': ']', '{': '{', '}': '}', '/': '/', '\\': '\\',
  '@': '@', '#': '#', '$': '$', '%': '%', '^': '^', '&': '&', '*': '*', '+': '+', '=': '=',
  '\'': '\'', '"': '"', '`': '`', '~': '~', '|': '|', '<': '<', '>': '>',
};

/**
 * Checks if a character is Arabic/Kurdish (Arabic script)
 */
function isArabicScript(char: string): boolean {
  const code = char.charCodeAt(0);
  // Arabic script ranges: U+0600-U+06FF (Arabic), U+0750-U+077F (Arabic Supplement),
  // U+08A0-U+08FF (Arabic Extended-A), U+FB50-U+FDFF (Arabic Presentation Forms-A),
  // U+FE70-U+FEFF (Arabic Presentation Forms-B)
  return (code >= 0x0600 && code <= 0x06FF) ||
         (code >= 0x0750 && code <= 0x077F) ||
         (code >= 0x08A0 && code <= 0x08FF) ||
         (code >= 0xFB50 && code <= 0xFDFF) ||
         (code >= 0xFE70 && code <= 0xFEFF);
}

/**
 * Converts Arabic character to Mathematical Bold Arabic equivalent
 * Maps common Arabic letters to their bold mathematical forms (U+1EE00-U+1EEFF)
 * Note: These are isolated forms and may not connect properly in LinkedIn
 */
function toBoldArabicUnicode(char: string): string {
  const code = char.charCodeAt(0);
  
  // Map common Arabic letters to Mathematical Bold Arabic Symbols (isolated forms)
  // Note: These may not render correctly in all fonts or connect properly
  const arabicBoldMap: { [key: number]: number } = {
    // Basic Arabic letters to their bold isolated forms
    0x0627: 0x1EE21, // ا -> 𞸡 (alif)
    0x0628: 0x1EE00, // ب -> 𞸀 (beh)
    0x062A: 0x1EE05, // ت -> 𞸅 (teh)
    0x062B: 0x1EE06, // ث -> 𞸆 (theh)
    0x062C: 0x1EE07, // ج -> 𞸇 (jeem)
    0x062D: 0x1EE08, // ح -> 𞸈 (hah)
    0x062E: 0x1EE09, // خ -> 𞸉 (khah)
    0x062F: 0x1EE0A, // د -> 𞸊 (dal)
    0x0630: 0x1EE0B, // ذ -> 𞸋 (thal)
    0x0631: 0x1EE0C, // ر -> 𞸌 (reh)
    0x0632: 0x1EE0D, // ز -> 𞸍 (zain)
    0x0633: 0x1EE0E, // س -> 𞸎 (seen)
    0x0634: 0x1EE0F, // ش -> 𞸏 (sheen)
    0x0635: 0x1EE10, // ص -> 𞸐 (sad)
    0x0636: 0x1EE11, // ض -> 𞸑 (dad)
    0x0637: 0x1EE12, // ط -> 𞸒 (tah)
    0x0638: 0x1EE13, // ظ -> 𞸓 (zah)
    0x0639: 0x1EE14, // ع -> 𞸔 (ain)
    0x063A: 0x1EE15, // غ -> 𞸕 (ghain)
    0x0641: 0x1EE16, // ف -> 𞸖 (feh)
    0x0642: 0x1EE17, // ق -> 𞸗 (qaf)
    0x0643: 0x1EE18, // ك -> 𞸘 (kaf)
    0x0644: 0x1EE19, // ل -> 𞸙 (lam)
    0x0645: 0x1EE1A, // م -> 𞸚 (meem)
    0x0646: 0x1EE1B, // ن -> 𞸛 (noon)
    0x0647: 0x1EE1C, // ه -> 𞸜 (heh)
    0x0648: 0x1EE1D, // و -> 𞸝 (waw)
    0x064A: 0x1EE1E, // ي -> 𞸞 (yeh)
    0x0649: 0x1EE1E, // ى -> 𞸞 (alef maksura)
    // Kurdish-specific characters (keep as-is if no mapping)
    0x06C6: 0x1EE1D, // ۆ -> 𞸝 (waw with ring, approximate)
    0x0698: 0x1EE0D, // ژ -> 𞸍 (zhe, approximate)
    0x06AF: 0x1EE18, // گ -> 𞸘 (gaf, approximate)
    0x06BE: 0x1EE1C, // ھ -> 𞸜 (heh doachashmee, approximate)
  };
  
  const boldCode = arabicBoldMap[code];
  if (boldCode) {
    try {
      return String.fromCharCode(boldCode);
    } catch (e) {
      // Fallback if character can't be created
      return char;
    }
  }
  
  // If no mapping exists, return original character
  // This is important for Kurdish-specific characters and diacritics
  return char;
}

/**
 * Converts a string to Unicode bold characters
 * For Arabic/Kurdish characters, uses Mathematical Bold Arabic Symbols where available
 */
function toBoldUnicode(text: string): string {
  return text.split('').map(char => {
    // Convert Arabic/Kurdish characters to bold if available
    if (isArabicScript(char)) {
      return toBoldArabicUnicode(char);
    }
    // Convert Latin characters to bold Unicode
    return BOLD_UNICODE_MAP[char] || char;
  }).join('');
}

/**
 * Converts a string to Unicode italic characters
 * Note: Arabic/Kurdish characters don't have italic Unicode equivalents,
 * so they are kept as-is
 */
function toItalicUnicode(text: string): string {
  return text.split('').map(char => {
    // Keep Arabic/Kurdish characters as-is (no italic Unicode available)
    if (isArabicScript(char)) {
      return char;
    }
    // Convert Latin characters to italic Unicode
    return ITALIC_UNICODE_MAP[char] || char;
  }).join('');
}

/**
 * Helper: Converts HTML to plain text, preserving structure
 */
function htmlToTextHelper(html: string): string {
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}

/**
 * Converts HTML lists to plain text format
 * Note: This should be called AFTER bold/italic conversion, so Unicode characters are preserved
 */
function convertLists(html: string): string {
  let result = html;
  
  // Convert ordered lists (ol) to numbered format
  result = result.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
    return items.map((item: string, index: number) => {
      // Extract text content (Unicode formatting should already be applied)
      // Use DOM parsing to preserve Unicode characters
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = item;
      const text = (tempDiv.textContent || tempDiv.innerText || '').trim();
      return `${index + 1}. ${text}`;
    }).join('\n') + '\n';
  });
  
  // Convert unordered lists (ul) to bullet format
  result = result.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
    return items.map((item: string) => {
      // Extract text content (Unicode formatting should already be applied)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = item;
      const text = (tempDiv.textContent || tempDiv.innerText || '').trim();
      return `• ${text}`;
    }).join('\n') + '\n';
  });
  
  // Convert standalone list items (if any)
  result = result.replace(/<li[^>]*>(.*?)<\/li>/gis, (match, content) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const text = (tempDiv.textContent || tempDiv.innerText || '').trim();
    return `• ${text}`;
  });
  
  return result;
}

/**
 * Converts HTML to LinkedIn-compatible format
 * 
 * @param html - HTML content to convert
 * @param useUnicode - If true, uses Unicode characters for bold/italic. If false, strips formatting.
 * @returns LinkedIn-compatible plain text with optional Unicode formatting
 */
/**
 * Recursively converts formatting in a DOM node to Unicode
 */
function convertNodeToUnicode(node: Node, useUnicode: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  
  // Handle bold
  if (tagName === 'strong' || tagName === 'b') {
    const content = Array.from(element.childNodes)
      .map(child => convertNodeToUnicode(child, useUnicode))
      .join('');
    return useUnicode ? toBoldUnicode(content) : content;
  }
  
  // Handle italic
  if (tagName === 'em' || tagName === 'i') {
    const content = Array.from(element.childNodes)
      .map(child => convertNodeToUnicode(child, useUnicode))
      .join('');
    return useUnicode ? toItalicUnicode(content) : content;
  }
  
  // Handle list items
  if (tagName === 'li') {
    const content = Array.from(element.childNodes)
      .map(child => convertNodeToUnicode(child, useUnicode))
      .join('');
    return content;
  }
  
  // Handle other elements - just process children
  return Array.from(element.childNodes)
    .map(child => convertNodeToUnicode(child, useUnicode))
    .join('');
}

export function convertHtmlToLinkedInFormat(html: string, useUnicode: boolean = true): string {
  if (!html || html.trim() === '') {
    return '';
  }

  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Fallback for server-side: simple conversion
    let result = html.replace(/<[^>]+>/g, '');
    result = result.replace(/&nbsp;/g, ' ');
    result = result.replace(/\n{3,}/g, '\n\n');
    return result.trim();
  }

  // Parse HTML into DOM
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  let result = '';
  
  // Process each top-level node
  Array.from(tempDiv.childNodes).forEach(node => {
    const nodeName = (node as Element).tagName?.toLowerCase();
    
    // Handle lists
    if (nodeName === 'ul') {
      const items = Array.from((node as Element).querySelectorAll('li') || []);
      items.forEach((item, index) => {
        const content = convertNodeToUnicode(item, useUnicode).trim();
        if (content) {
          result += `• ${content}\n`;
        }
      });
    } else if (nodeName === 'ol') {
      const items = Array.from((node as Element).querySelectorAll('li') || []);
      items.forEach((item, index) => {
        const content = convertNodeToUnicode(item, useUnicode).trim();
        if (content) {
          result += `${index + 1}. ${content}\n`;
        }
      });
    } else if (nodeName === 'p' || nodeName === 'div') {
      // Handle paragraphs and divs
      const content = convertNodeToUnicode(node, useUnicode).trim();
      if (content) {
        result += content + '\n\n';
      }
    } else if (nodeName === 'br') {
      result += '\n';
    } else {
      // Handle other elements (including plain text nodes)
      const content = convertNodeToUnicode(node, useUnicode);
      result += content;
    }
  });
  
  // If no structure found, process as plain HTML
  if (!result && tempDiv.textContent) {
    // Fallback: use regex-based conversion
    let fallbackResult = html;
    
    // Process bold/italic with regex
    if (useUnicode) {
      fallbackResult = fallbackResult.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gis, (m, t, c) => {
        const clean = c.replace(/<[^>]+>/g, '');
        const decoded = document.createElement('div');
        decoded.innerHTML = clean;
        return toBoldUnicode(decoded.textContent || decoded.innerText || '');
      });
      
      fallbackResult = fallbackResult.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gis, (m, t, c) => {
        const clean = c.replace(/<[^>]+>/g, '');
        const decoded = document.createElement('div');
        decoded.innerHTML = clean;
        return toItalicUnicode(decoded.textContent || decoded.innerText || '');
      });
    }
    
    // Convert lists
    fallbackResult = convertLists(fallbackResult);
    
    // Remove remaining tags
    fallbackResult = fallbackResult.replace(/<[^>]+>/g, '');
    
    // Decode entities
    const decoded = document.createElement('div');
    decoded.innerHTML = fallbackResult;
    result = decoded.textContent || decoded.innerText || '';
  }

  // Clean up multiple consecutive newlines (max 2)
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Trim leading/trailing whitespace
  result = result.trim();
  
  return result;
}

/**
 * Converts HTML to plain text (for character counting)
 */
export function htmlToPlainText(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }

  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Fallback for server-side: simple tag removal
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  // Use the LinkedIn formatter with Unicode disabled to get plain text
  return convertHtmlToLinkedInFormat(html, false);
}

/**
 * Converts plain text to HTML (for loading old drafts)
 */
export function plainTextToHtml(text: string): string {
  if (!text || text.trim() === '') {
    return '';
  }

  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Fallback for server-side: simple conversion
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // Escape HTML entities
  const div = document.createElement('div');
  div.textContent = text;
  let html = div.innerHTML;
  
  // Convert line breaks to <br> tags
  html = html.replace(/\n/g, '<br>');
  
  // Convert bullet points to list items
  html = html.replace(/^•\s+(.+)$/gm, '<li>$1</li>');
  if (html.includes('<li>')) {
    html = `<ul>${html}</ul>`;
  }
  
  return html;
}
