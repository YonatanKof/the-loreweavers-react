import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	const url = request.nextUrl.searchParams.get('url');

	if (!url) {
		return new NextResponse('Missing url parameter', { status: 400 });
	}

	// Only proxy Notion-owned domains
	const allowed = [
		'prod-files-secure.s3.us-east-1.amazonaws.com',
		'prod-files-secure.s3.us-west-2.amazonaws.com',
		's3.us-east-1.amazonaws.com',
		's3-us-west-2.amazonaws.com',
		'secure.notion-static.com',
		'www.notion.so',
		'notion.so',
	];

	let hostname: string;
	try {
		hostname = new URL(url).hostname;
	} catch {
		return new NextResponse('Invalid url', { status: 400 });
	}

	if (!allowed.some((domain) => hostname.endsWith(domain))) {
		return new NextResponse('Domain not allowed', { status: 403 });
	}

	try {
		const response = await fetch(url, {
			headers: {
				// Pass through a browser-like UA to avoid S3 blocking
				'User-Agent': 'Mozilla/5.0',
			},
			next: { revalidate: 3600 }, // cache the proxied image for 1 hour
		});

		if (!response.ok) {
			return new NextResponse('Failed to fetch image', {
				status: response.status,
			});
		}

		const contentType = response.headers.get('content-type') ?? 'image/jpeg';
		const buffer = await response.arrayBuffer();

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				// Browser caches the image for 1 hour, CDN for 1 day
				'Cache-Control': 'public, max-age=3600, s-maxage=86400',
			},
		});
	} catch {
		return new NextResponse('Proxy error', { status: 500 });
	}
}
