import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Saba-i Massage Management",
  description: "ระบบจัดการร้านนวดไทย - Saba-i Massage",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(15px)',
              WebkitBackdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              color: '#374151',
              fontWeight: '600',
              padding: '16px',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            },
            success: {
              style: {
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#166534',
              },
            },
            error: {
              style: {
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#991b1b',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
