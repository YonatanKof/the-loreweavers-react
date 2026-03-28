import type { Metadata } from 'next';
import { Cinzel } from 'next/font/google';
import { Analytics } from "@vercel/analytics/next"
import './globals.css';

const cinzel = Cinzel({
	subsets: ['latin'],
	weight: ['400', '600'],
	variable: '--font-cinzel',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'The Loreweavers',
	description: 'A chronicle of our D&D sessions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="he" dir="rtl" className={cinzel.variable}>
			<body>{children}</body>
		</html>
	);
}
