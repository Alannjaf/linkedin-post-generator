# LinkedIn Post Generator

A personal web application for generating LinkedIn posts from draft ideas using AI, with support for Kurdish and English languages.

## Features

- **AI-Powered Generation**: Uses OpenRouter API to generate professional LinkedIn posts
- **Multi-Language Support**: Generate posts in English or Kurdish
- **Tone Control**: Choose from Professional, Casual, Friendly, Inspirational, Informative, or Comedy tones
- **Length Control**: Short (~300 chars), Medium (~800 chars), or Long (~1500+ chars)
- **Hashtag Suggestions**: AI-generated relevant hashtags
- **Draft Management**: Save, load, and manage your drafts with localStorage
- **Character Counter**: Real-time character count with LinkedIn's 3000 character limit
- **Export Options**: Copy to clipboard or export as text file
- **Editable Posts**: Edit generated posts before saving or exporting

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenRouter API key ([Get one here](https://openrouter.ai/))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

   Note: The API key is kept server-side for security. Do not use `NEXT_PUBLIC_` prefix.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Enter your draft idea or context in the input field
2. Select your preferred language (English or Kurdish)
3. Choose the tone and length for your post
4. Click "Generate Post" to create your LinkedIn post
5. Review and edit the generated post as needed
6. Select suggested hashtags to add to your post
7. Save as draft, copy to clipboard, or export as text file

## Project Structure

```
linkedin-post-generator/
├── app/                    # Next.js app directory
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── PostGenerator.tsx   # Post generation form
│   ├── PostEditor.tsx      # Editable post display
│   ├── HashtagSuggestions.tsx # Hashtag component
│   ├── DraftManager.tsx    # Draft history
│   └── CharacterCounter.tsx # Character count display
├── lib/                    # Utility libraries
│   ├── openrouter.ts       # OpenRouter API client
│   ├── storage.ts          # localStorage utilities
│   └── prompts.ts          # AI prompt templates
└── types/                  # TypeScript types
    └── index.ts
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **OpenRouter API** - AI model access

## Notes

- Drafts are stored in browser localStorage (limited to 50 drafts)
- The app uses Google Gemini 3 Pro for text generation and Gemini 3 Pro Image Preview for image generation
- All data is stored locally in your browser - no backend required
- Drafts can include generated images and are fully restorable

## Deployment

### Deploy to Netlify

1. Push your code to GitHub
2. Go to [Netlify](https://www.netlify.com/) and sign in
3. Click "New site from Git" and connect your repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add environment variable:
   - `OPENROUTER_API_KEY` - Your OpenRouter API key
6. Click "Deploy site"

The site will be automatically deployed on every push to your main branch.

## License

Personal use only

