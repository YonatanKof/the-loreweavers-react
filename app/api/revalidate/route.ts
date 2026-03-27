import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	const secret = request.nextUrl.searchParams.get('secret');

	if (secret !== process.env.REVALIDATE_SECRET) {
		return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
	}

	revalidateTag("notion-posts", { expire: 0 });

	return NextResponse.json({
		revalidated: true,
		timestamp: new Date().toISOString(),
	});
}