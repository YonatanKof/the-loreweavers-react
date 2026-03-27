import { getPosts } from '@/lib/notion';
import type { Post } from '@/lib/notion';
import Link from 'next/link';
import styles from './blog.module.css';

export const revalidate = 300; // Plan A fallback: revalidate every 5 min

export const metadata = {
	title: 'Session Summaries',
	description: 'A log of all The Loreweavers D&D sessions.',
};

export default async function BlogPage() {
	const posts = await getPosts();

	return (
		<main className={styles.main}>
			<h1 className={styles.heading}>Session Summaries</h1>
			<ul className={styles.list}>
				{posts.map((post) => (
					<PostCard key={post.slug} post={post} />
				))}
			</ul>
		</main>
	);
}

function PostCard({ post }: { post: Post }) {
	return (
		<li className={styles.card}>
			<Link href={`/blog/${post.slug}`} className={styles.cardLink}>
				{post.coverImage && (
					<div className={styles.cardImage}>
						<img src={post.coverImage} alt={post.displayName} />
					</div>
				)}
				<div className={styles.cardBody}>
					<span className={styles.sessionNumber}>Session {post.sessionNumber}</span>
					<h2 className={styles.cardTitle}>{post.displayName}</h2>
					{post.description && <p className={styles.cardDescription}>{post.description}</p>}
					<time className={styles.cardDate} dateTime={post.date}>
						{formatDate(post.date)}
					</time>
				</div>
			</Link>
		</li>
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