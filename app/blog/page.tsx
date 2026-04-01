import { getPosts } from '@/lib/notion';
import type { Post } from '@/lib/notion';
import Link from 'next/link';
import styles from './blog.module.css';
import { ImageGallery } from './ImageGallery';

export const revalidate = 300; // Plan A fallback: revalidate every 5 min

export const metadata = {
	title: 'The Loreweavers Game Log',
	description: 'The amazing Loreweavers and their epic quest to save/remake the world from/with darkness!',
};

export default async function BlogPage() {
	const posts = await getPosts();

	return (
		<main className={styles.main}>
			<header className={styles.mainHeader}>
				<div>
					<h1 className={styles.heading}>טווי האגדות</h1>
					<h2 className={styles.subHeading}>יומן מסעות ומור״ק אגדית!</h2>
				</div>
				<img src="./the-loreweavers.webp" alt="The Loreweavers Logo" />
			</header>
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
				{Array.isArray(post.coverImage) ? (
					<div className={styles.cardImage}>
						<ImageGallery images={post.coverImage} alt={post.displayName} />
					</div>
				) : post.coverImage ? (
					<div className={styles.cardImage}>
						<img src={post.coverImage} alt={post.displayName} />
					</div>
				) : null}
				<div className={styles.cardBody}>
					<div className={styles.cardMeta}>
						<span className={styles.cardDate}>סשן {post.sessionNumber}</span>
						<span className={styles.cardDate}> • </span>
						<time className={styles.cardDate} dateTime={post.date}>
							{formatDate(post.date)}
						</time>
					</div>
					<h2 className={styles.cardTitle}>{post.displayName}</h2>
					{post.description && <p className={styles.cardDescription}>{post.description}</p>}
				</div>
			</Link>
		</li>
	);
}

function formatDate(dateStr: string): string {
	if (!dateStr) return '';
	return new Date(dateStr).toLocaleDateString('he-IL', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
