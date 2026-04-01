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
	id: string;
	slug: string;
	name: string;
	sessionNumber: number;
	type: string;
	date: string;
	displayName: string;
	description: string;
	coverImage: string | string[] | null;
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

function getCoverImage(page: PageObjectResponse): string | string[] | null {
	// First try the Cover image property
	const prop = page.properties['Cover image'];
	if (prop?.type === 'files' && prop.files.length > 0) {
		const urls = prop.files
			.map((file) => {
				if (file.type === 'external') return file.external.url;
				if (file.type === 'file') return file.file.url;
				return null;
			})
			.filter((url): url is string => url !== null);
		if (urls.length === 1) return urls[0];
		if (urls.length > 1) return urls;
	}
	// Fall back to the Notion page cover
	const cover = page.cover;
	if (!cover) return null;
	if (cover.type === 'external') return cover.external.url;
	if (cover.type === 'file') return cover.file.url;
	return null;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

function mapPageToPost(page: PageObjectResponse): Post {
	const sessionNumber = getNumber(page, 'Session number');
	return {
		id: page.id,
		slug: `session-num-${sessionNumber}`,
		name: getTitle(page, 'Name'),
		sessionNumber,
		type: getSelect(page, 'Type'),
		date: getDate(page, 'Date'),
		displayName: getRichText(page, 'Display name'),
		description: getRichText(page, 'Description'),
		coverImage: proxyCoverImage(getCoverImage(page)),
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
function proxyCoverImage(url: string | string[] | null): string | string[] | null {
	if (Array.isArray(url)) return url.map((u) => proxyImageUrl(u)).filter((u): u is string => u !== null);
	return proxyImageUrl(url);
}

export function proxyImageUrl(url: string | null): string | null {
	if (!url) return null;
	return `/api/image?url=${encodeURIComponent(url)}`;
}
import { NotionToMarkdown } from 'notion-to-md';
import { marked } from 'marked';

const n2m = new NotionToMarkdown({ notionClient: notion });

// Custom transformer for images — proxy Notion S3 URLs
n2m.setCustomTransformer('image', async (block: any) => {
	const url = block.image?.type === 'file' ? proxyImageUrl(block.image.file.url) : (block.image?.external?.url ?? '');
	const caption = block.image?.caption?.map((t: any) => t.plain_text).join('') ?? '';
	return `![${caption}](${url})`;
});

export async function getPageMarkdown(pageId: string): Promise<string> {
	const mdBlocks = await n2m.pageToMarkdown(pageId);
	const { parent: mdString } = n2m.toMarkdownString(mdBlocks);
	return marked(mdString) as string;
}
