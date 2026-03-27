import { Client, isFullPageOrDataSource } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { unstable_cache } from 'next/cache';

// ─── Client ──────────────────────────────────────────────────────────────────

const notion = new Client({
	auth: process.env.NOTION_TOKEN,
});

const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID!;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Post {
	slug: string;
	name: string;
	sessionNumber: number;
	type: string;
	date: string;
	displayName: string;
	description: string;
	coverImage: string | null;
}

// ─── Property helpers ────────────────────────────────────────────────────────

function getTitle(page: PageObjectResponse, prop: string): string {
	const p = page.properties[prop];
	if (p?.type === 'title') return p.title.map((t) => t.plain_text).join('');
	return '';
}

function getRichText(page: PageObjectResponse, prop: string): string {
	const p = page.properties[prop];
	if (p?.type === 'rich_text') return p.rich_text.map((t) => t.plain_text).join('');
	return '';
}

function getNumber(page: PageObjectResponse, prop: string): number {
	const p = page.properties[prop];
	if (p?.type === 'number') return p.number ?? 0;
	return 0;
}

function getSelect(page: PageObjectResponse, prop: string): string {
	const p = page.properties[prop];
	if (p?.type === 'select') return p.select?.name ?? '';
	return '';
}

function getDate(page: PageObjectResponse, prop: string): string {
	const p = page.properties[prop];
	if (p?.type === 'date') return p.date?.start ?? '';
	return '';
}

function getCoverImage(page: PageObjectResponse): string | null {
	const cover = page.cover;
	if (!cover) return null;
	if (cover.type === 'external') return cover.external.url;
	if (cover.type === 'file') return cover.file.url; // ⚠️ expires — proxy later
	return null;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

function mapPageToPost(page: PageObjectResponse): Post {
	const sessionNumber = getNumber(page, 'Session number');
	return {
		slug: `session-num-${sessionNumber}`,
		name: getTitle(page, 'Name'),
		sessionNumber,
		type: getSelect(page, 'Type'),
		date: getDate(page, 'Date'),
		displayName: getRichText(page, 'Display name'),
		description: getRichText(page, 'Description'),
		coverImage: getCoverImage(page),
	};
}

// ─── Queries ─────────────────────────────────────────────────────────────────

// Replace the existing getPosts export with this:
export const getPosts = unstable_cache(
	async (): Promise<Post[]> => {
		const response = await notion.dataSources.query({
			data_source_id: DATA_SOURCE_ID,
			filter: {
				and: [
					{
						property: 'Type',
						select: { equals: 'Session summary' },
					},
					{
						property: 'Verification',
						verification: { status: 'verified' },
					},
				],
			},
			sorts: [{ property: 'Date', direction: 'descending' }],
		});

		return response.results.filter(isFullPageOrDataSource).map((page) => mapPageToPost(page as PageObjectResponse));
	},
	['notion-posts'], // cache key
	{
		tags: ['notion-posts'], // invalidation tag — matches revalidateTag() call
		revalidate: 300, // Plan A fallback: 5 min
	},
);
export async function getPostBySlug(slug: string): Promise<Post | null> {
	const all = await getPosts();
	return all.find((p) => p.slug === slug) ?? null;
}
