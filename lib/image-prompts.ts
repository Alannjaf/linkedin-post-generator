import { Language } from '@/types';

export function buildImagePrompt(params: {
  postContent: string;
  language: Language;
}): string {
  const { postContent, language } = params;

  // Extract key themes and topics from the post
  const content = postContent.toLowerCase();
  
  // Identify main topics with better keyword matching
  const topicKeywords: Record<string, string[]> = {
    technology: ['technology', 'tech', 'software', 'digital', 'ai', 'artificial intelligence', 'coding', 'programming', 'developer', 'app', 'platform'],
    business: ['business', 'entrepreneur', 'startup', 'company', 'enterprise', 'corporate', 'market', 'industry'],
    career: ['career', 'professional', 'job', 'work', 'employment', 'resume', 'cv', 'interview'],
    leadership: ['leadership', 'leader', 'team', 'management', 'manager', 'executive', 'ceo', 'director'],
    innovation: ['innovation', 'creative', 'idea', 'invent', 'breakthrough', 'disrupt', 'transform'],
    success: ['success', 'achievement', 'goal', 'accomplish', 'win', 'victory', 'milestone'],
    learning: ['learning', 'education', 'skill', 'training', 'course', 'study', 'knowledge', 'teach'],
    networking: ['network', 'connection', 'community', 'collaborate', 'partnership', 'relationship'],
    motivation: ['motivation', 'inspire', 'encourage', 'empower', 'growth', 'mindset'],
  };

  const detectedTopics: string[] = [];
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      detectedTopics.push(topic);
    }
  }

  const mainTopic = detectedTopics[0] || 'professional';
  const secondaryTopics = detectedTopics.slice(1, 3).join(', ');

  // Extract key concepts (first 200 chars for context)
  const summary = postContent.substring(0, 300).replace(/\n/g, ' ').trim();

  // Build a comprehensive image generation prompt
  // Make it explicit that we want an image generated
  const basePrompt = `Generate a professional, high-quality image for a LinkedIn post based on the following content.

Post Content Context:
${summary}

You must generate an image (not describe one). The image should be:

Visual Requirements:
- Professional and modern design suitable for LinkedIn
- Clean, minimalist aesthetic with plenty of white space
- Main theme: ${mainTopic}${secondaryTopics ? `, with elements of ${secondaryTopics}` : ''}
- Professional color palette: use blues (#0066CC, #1E3A8A), grays (#4B5563, #6B7280), or warm professional tones
- High contrast for visibility on social media
- Aspect ratio: 16:9 or 1:1 (square) format
- Resolution: 1200x1200 pixels minimum
- Style: Modern professional photography or clean illustration
- Mood: Inspiring, confident, and engaging
- No text overlays or watermarks
- Subtle visual metaphors that relate to the content theme
- Professional lighting and composition

Specific Visual Elements:
${getVisualElements(mainTopic)}

The image should complement the LinkedIn post content, not duplicate it. It should be visually striking and professional, suitable for a business social media platform.`;

  return basePrompt;
}

function getVisualElements(topic: string): string {
  const elements: Record<string, string> = {
    technology: '- Abstract tech elements: circuit patterns, data visualizations, or digital networks\n- Modern devices or screens\n- Clean, futuristic aesthetic',
    business: '- Business meeting scenes, handshakes, or collaboration\n- Office environments or business charts\n- Professional workspace elements',
    career: '- Professional workspace, resume, or career ladder\n- Success symbols like upward arrows or growth charts\n- Professional attire or office settings',
    leadership: '- Team collaboration or group dynamics\n- Leadership symbols like guiding light or compass\n- Professional team meeting or presentation',
    innovation: '- Lightbulb, gears, or creative symbols\n- Abstract innovation concepts\n- Modern, forward-thinking visuals',
    success: '- Achievement symbols: trophy, checkmark, or star\n- Growth charts or upward trends\n- Celebration or accomplishment imagery',
    learning: '- Books, graduation cap, or educational symbols\n- Knowledge tree or learning path\n- Student or professional development imagery',
    networking: '- Connected nodes or network diagrams\n- Handshakes or professional connections\n- Community or collaboration visuals',
    motivation: '- Inspiring landscapes or sunrise\n- Growth and progress symbols\n- Positive, uplifting imagery',
    professional: '- Clean, modern office space\n- Professional color scheme\n- Abstract business elements',
  };

  return elements[topic] || elements.professional;
}

