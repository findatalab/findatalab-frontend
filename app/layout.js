import './globals.css';

export const metadata = {
  title: 'Лаборатория анализа данных',
  description: 'Frontend for the findatalab projects',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}