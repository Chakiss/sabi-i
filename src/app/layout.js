import { Nunito, Kanit } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../contexts/AuthContext';
import AppWrapper from '../components/AppWrapper';

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

const kanit = Kanit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Saba-i Massage Management",
  description: "ระบบจัดการร้านนวดไทย - Saba-i Massage",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Saba-i Massage'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#B89B85'
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body
        className={`${kanit.variable} ${nunito.variable} font-body antialiased bg-background`}
      >
        <AuthProvider>
          <AppWrapper>
            {children}
          </AppWrapper>
        </AuthProvider>
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
