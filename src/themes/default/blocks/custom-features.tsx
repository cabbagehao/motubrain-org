'use client';

import { motion } from 'framer-motion';

import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function CustomFeatures({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
    return (
    <section
      id={section.id || section.name}
      className={cn('pt-24 md:pt-36', section.className, className)}
    >
      <motion.div
        className="container mb-12 text-center"
        initial={{ opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0,
        }}
      >
        {section.sr_only_title && (
          <h1 className="sr-only">{section.sr_only_title}</h1>
        )}
        <h2 className="mx-auto mb-6 max-w-full text-3xl font-bold text-pretty md:max-w-5xl lg:text-4xl">
          {section.title}
        </h2>
        <p className="text-muted-foreground text-md mx-auto mb-4 max-w-full md:max-w-5xl">
          {section.description}
        </p>
      </motion.div>
    </section>)
}