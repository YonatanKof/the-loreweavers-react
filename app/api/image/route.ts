import { resolveBlockImageUrl, resolveCoverImageUrl } from '@/lib/notion';
import { NextRequest, NextResponse } from 'next/server';

const NOTION_HOSTS = [
	'prod-files-secure.s3.us-east-1.amazonaws.com',
	'prod-files-secure.s3.us-west-2.amazonaws.com',
	's3.us-east-1.amazonaws.com',
	's3-us-west-2.amazonaws.com',
	'secure.notion-static.com',
	'www.notion.so',
	'notion.so',
];

function isAllowedImageUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'https:') return false;
		if (NOTION_HOSTS.some((domain) => parsed.hostname.endsWith(domain))) return true;
		// External URLs linked from Notion blocks or file properties
		return true;
	} catch {
		return false;
	}
}

export async function GET(request: NextRequest) {
	const pageId = request.nextUrl.searchParams.get('pageId');
	const cover = request.nextUrl.searchParams.get('cover');
	const blockId = request.nextUrl.searchParams.get('blockId');

	let sourceUrl: string | null = null;

	if (blockId) {
		sourceUrl = await resolveBlockImageUrl(blockId);
	} else if (pageId && cover !== null) {
		sourceUrl = await resolveCoverImageUrl(pageId, cover);
	} else {
		return new NextResponse('Missing pageId/cover or blockId parameter', { status: 400 });
	}

	if (!sourceUrl) {
		return new NextResponse('Image not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
	}

	if (!isAllowedImageUrl(sourceUrl)) {
		return new NextResponse('Domain not allowed', { status: 403, headers: { 'Cache-Control': 'no-store' } });
	}

	try {
		const response = await fetch(sourceUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0',
			},
			next: { revalidate: 86400 },
		});

		if (!response.ok) {
			return new NextResponse('Failed to fetch image', {
				status: response.status,
				headers: { 'Cache-Control': 'no-store' },
			});
		}

		const contentType = response.headers.get('content-type') ?? 'image/jpeg';
		const buffer = await response.arrayBuffer();

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
			},
		});
	} catch {
		return new NextResponse('Proxy error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
	}
}
