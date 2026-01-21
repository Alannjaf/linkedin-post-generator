import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LinkedIn Post Generator - AI-Powered Content Creation',
  description: 'Generate professional, engaging LinkedIn posts with AI. Create compelling content that drives engagement and grows your professional network.',
  keywords: 'LinkedIn, post generator, AI, content creation, social media, professional networking',
}

// Script to prevent flash of wrong theme
const themeScript = `
  (function() {
    const stored = localStorage.getItem('linkedin-post-generator-theme');
    const theme = stored || 'system';
    let resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (resolved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <ThemeProvider>
          {/* Background gradient effect - uses CSS variables for theme-aware colors */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl bg-gradient-bg-purple" />
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl bg-gradient-bg-blue" />
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
