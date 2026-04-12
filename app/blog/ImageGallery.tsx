'use client';

import { useState, useCallback } from 'react';
import styles from './blog.module.css';

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
	const [index, setIndex] = useState(0);

	const prev = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setIndex((i) => (i - 1 + images.length) % images.length);
		},
		[images.length],
	);

	const next = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setIndex((i) => (i + 1) % images.length);
		},
		[images.length],
	);

	return (
		<div className={styles.gallery}>
			<img src={images[index]} alt={`${alt} ${index + 1}`} />
			<button className={`${styles.galleryArrow} ${styles.galleryArrowPrev}`} onClick={prev} aria-label="Previous image">
				‹
			</button>
			<button className={`${styles.galleryArrow} ${styles.galleryArrowNext}`} onClick={next} aria-label="Next image">
				›
			</button>
			<div className={styles.galleryDots}>
				{images.map((_, i) => (
					<button
						key={i}
						className={`${styles.galleryDot} ${i === index ? styles.galleryDotActive : ''}`}
						onClick={(e) => {
							e.preventDefault();
							setIndex(i);
						}}
						aria-label={`Go to image ${i + 1}`}
					/>
				))}
			</div>
		</div>
	);
}
