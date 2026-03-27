import { getPosts, getPostBySlug } from '@/lib/notion';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from '../blog.module.css';

export const revalidate = 300;

// Pre-generate all known slugs at build time
export async function generateStaticParams() {
	const posts = await getPosts();
	return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const post = await getPostBySlug(slug);
	if (!post) return {};
	return {
		title: post.displayName,
		description: post.description,
	};
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const post = await getPostBySlug(slug);

	if (!post) notFound();

	return (
		<main className={styles.main}>
			<nav className={styles.breadcrumb}>
				<Link href="/blog">← All sessions</Link>
			</nav>

			{post.coverImage && (
				<div className={styles.heroCover}>
					<img src={post.coverImage} alt={post.displayName} />
				</div>
			)}

			<article className={styles.article}>
				<header className={styles.articleHeader}>
					<span className={styles.sessionNumber}>Session {post.sessionNumber}</span>
					<h1 className={styles.heading}>{post.displayName}</h1>
					<time className={styles.cardDate} dateTime={post.date}>
						{formatDate(post.date)}
					</time>
				</header>

				{post.description && <p className={styles.description}>{post.description}</p>}
			</article>
		</main>
	);
}

function formatDate(dateStr: string): string {
	if (!dateStr) return '';
	return new Date(dateStr).toLocaleDateString('en-IL', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
