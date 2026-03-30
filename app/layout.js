import './globals.css';

export const metadata = {
  title: 'Лаборатория анализа данных',
  description: 'Frontend for the findatalab projects',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}