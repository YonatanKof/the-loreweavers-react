import { getPosts, getPostBySlug, getPageMarkdown } from '@/lib/notion';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from '../blog.module.css';

export const revalidate = 300;

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

	const contentHtml = await getPageMarkdown(post.id);

	return (
		<main className={styles.main}>
			<nav className={styles.breadcrumb}>
				<Link href="/blog">
					← All sessions
				</Link>
			</nav>

			{post.coverImage && (
				<div className={styles.heroCover}>
					<img src={post.coverImage} alt={post.displayName} />
				</div>
			)}

			<article className={styles.article}>
				<header className={styles.articleHeader}>
					<h1 className={styles.postHeading}>{post.displayName}</h1>
					<div className={styles.cardMeta}>
						<span className={styles.cardDate}>סשן {post.sessionNumber}</span>
						<span className={styles.cardDate}> • </span>
						<time className={styles.cardDate} dateTime={post.date}>
							{formatDate(post.date)}
						</time>
					</div>
				</header>

				{post.description && <p className={styles.description}>{post.description}</p>}

				{contentHtml && <div className={styles.content} dir="rtl" dangerouslySetInnerHTML={{ __html: contentHtml }} />}
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
