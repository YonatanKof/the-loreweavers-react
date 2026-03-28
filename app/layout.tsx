import type { Metadata } from 'next';
import { Rubik, Rubik_Wet_Paint } from 'next/font/google';
import { Analytics } from "@vercel/analytics/next"
import './globals.css';

const rubik  = Rubik({
	weight: ['300', '400', '500', '600', '700', '800', '900'],
	variable: '--font-rubik ',
	display: 'swap',
});

const rubikWetPaint  = Rubik_Wet_Paint({
	subsets: ['hebrew'],
	weight: ['400'],
	variable: '--font-rubik-wet-paint ',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'The Loreweavers',
	description: 'A chronicle of our D&D sessions.',
	openGraph: {
		images: ['/the-loreweavers.jpg'],
	},
	twitter: {
		card: 'summary_large_image',
		images: ['/the-loreweavers.jpg'],
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="he" dir="rtl" className={`${rubikWetPaint.variable} ${rubik.variable}`}>
			<body>{children}<Analytics /></body>
		</html>
	);
}
