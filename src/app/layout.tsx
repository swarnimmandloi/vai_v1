import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VAI — Visual AI Workspace',
  description: 'An AI workspace where answers become interactive visual maps on an infinite canvas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
