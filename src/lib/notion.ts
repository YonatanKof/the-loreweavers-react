import { Client, isFullBlock, isFullPage, isFullPageOrDataSource } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionToMarkdown } from 'notion-to-md';
import { marked } from 'marked';
import { unstable_cache } from 'next/cache';

// ─── Client ──────────────────────────────────────────────────────────────────

const notion = new Client({
	auth: process.env.NOTION_TOKEN,
});

const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID!;

const n2m = new NotionToMarkdown({ notionClient: notion });

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

// ─── Stable image proxy URLs ─────────────────────────────────────────────────

export function proxyCoverImageUrl(pageId: string, cover: number | 'page'): string {
	if (cover === 'page') {
		return `/api/image?pageId=${encodeURIComponent(pageId)}&cover=page`;
	}
	return `/api/image?pageId=${encodeURIComponent(pageId)}&cover=${cover}`;
}

export function proxyBlockImageUrl(blockId: string): string {
	return `/api/image?blockId=${encodeURIComponent(blockId)}`;
}

function getCoverImageProxyUrls(page: PageObjectResponse): string | string[] | null {
	const prop = page.properties['Cover image'];
	if (prop?.type === 'files' && prop.files.length > 0) {
		const urls = prop.files.map((_, index) => proxyCoverImageUrl(page.id, index));
		if (urls.length === 1) return urls[0];
		return urls;
	}

	if (page.cover) {
		return proxyCoverImageUrl(page.id, 'page');
	}

	return null;
}

function fileUrlFromNotionFile(file: { type: string; external?: { url: string }; file?: { url: string } }): string | null {
	if (file.type === 'external') return file.external?.url ?? null;
	if (file.type === 'file') return file.file?.url ?? null;
	return null;
}

export async function resolveCoverImageUrl(pageId: string, cover: string): Promise<string | null> {
	const page = await notion.pages.retrieve({ page_id: pageId });
	if (!isFullPage(page)) return null;

	if (cover === 'page') {
		if (!page.cover) return null;
		return fileUrlFromNotionFile(page.cover);
	}

	const index = Number.parseInt(cover, 10);
	if (Number.isNaN(index)) return null;

	const prop = page.properties['Cover image'];
	if (prop?.type !== 'files' || !prop.files[index]) return null;

	return fileUrlFromNotionFile(prop.files[index]);
}

export async function resolveBlockImageUrl(blockId: string): Promise<string | null> {
	const block = await notion.blocks.retrieve({ block_id: blockId });
	if (!isFullBlock(block) || block.type !== 'image') return null;
	return fileUrlFromNotionFile(block.image);
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
		coverImage: getCoverImageProxyUrls(page),
	};
}

// ─── Queries ─────────────────────────────────────────────────────────────────

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
	['notion-posts'],
	{
		tags: ['notion-posts'],
		revalidate: 300,
	},
);

export async function getPostBySlug(slug: string): Promise<Post | null> {
	const all = await getPosts();
	return all.find((p) => p.slug === slug) ?? null;
}

// Custom transformer for images — stable proxy URLs keyed by block ID
n2m.setCustomTransformer('image', async (block: { id: string; image?: { caption?: { plain_text: string }[] } }) => {
	const url = proxyBlockImageUrl(block.id);
	const caption = block.image?.caption?.map((t) => t.plain_text).join('') ?? '';
	return `![${caption}](${url})`;
});

export async function getPageMarkdown(pageId: string): Promise<string> {
	const mdBlocks = await n2m.pageToMarkdown(pageId);
	const { parent: mdString } = n2m.toMarkdownString(mdBlocks);
	return marked(mdString) as string;
}
