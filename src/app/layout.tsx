import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Settle | End Money Arguments. Settle Shared Spending.',
  description:
    'AI money concierge for shared spending: transparent, explainable splits settled through PayPal invoices.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
