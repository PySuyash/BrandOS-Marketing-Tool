import { useState } from 'react';
import { Layers } from 'lucide-react';

export default function MediaFrame({
  src,
  alt,
  className = '',
  imgClassName = '',
  fallbackTitle = 'NovaTech Visual',
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-slate-200 p-6 ${className}`}
        role="img"
        aria-label={alt || fallbackTitle}
      >
        <Layers className="w-8 h-8 text-blue-400 mb-2" />
        <span className="text-xs font-medium tracking-wide text-slate-300 text-center">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover ${imgClassName}`}
      />
    </div>
  );
}
