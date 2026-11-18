export default function SectionHeading({
  as = 'h2',
  eyebrow,
  title,
  description,
  align = 'left',
  dark = false,
  className = '',
}) {
  const HeadingTag = as === 'h1' ? 'h1' : 'h2';
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  const eyebrowClass = dark ? 'text-blue-400' : 'text-blue-700';
  const titleClass = dark ? 'text-white' : 'text-slate-950';
  const descClass = dark ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {eyebrow && (
        <p className={`text-sm font-semibold tracking-tight mb-2 ${eyebrowClass}`}>
          {eyebrow}
        </p>
      )}
      <HeadingTag
        className={`font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance leading-tight ${titleClass}`}
      >
        {title}
      </HeadingTag>
      {description && (
        <p className={`mt-4 text-base sm:text-lg leading-relaxed ${descClass}`}>
          {description}
        </p>
      )}
    </div>
  );
}
