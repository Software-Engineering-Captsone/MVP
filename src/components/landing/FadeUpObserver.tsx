"use client";

import { useEffect } from 'react';

export default function FadeUpObserver() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('visible');
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
        );

        document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return null;
}
