import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import Navbar from './components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Delta Plus Technical Department',
  description: 'Project management for the technical arm of Delta Plus.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main>{children}</main>
        <footer className="footer">
          <p>&copy; 2026 Delta Plus Technical Department</p>
        </footer>
      </body>
    </html>
  );
}
