import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string().min(1),
    status: z.enum(['draft', 'approved']),
    region: z.string().min(1),
    source: z.string().min(1),
    reviewer: z.string().min(1),
    context: z.string().min(1),
    rightsConfirmed: z.boolean(),
  }).refine(
    (lesson) => lesson.status !== 'approved' || lesson.rightsConfirmed,
    { message: 'Bài chỉ được duyệt khi quyền sử dụng đã xác nhận.' },
  ),
});

export const collections = { lessons };
