import { Link } from 'react-router-dom';
import { ArrowRight, Code2, Cpu, Globe, Layers, Cloud, Compass } from 'lucide-react';

const ICON_MAP = {
  Code2,
  Cpu,
  Globe,
  Layers,
  Cloud,
  Compass,
};

export default function ServiceCard({ service }) {
  const Icon = ICON_MAP[service.icon] || Code2;

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-7 transition-colors hover:border-blue-300">
      <div>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="w-10 h-10 rounded-lg bg-slate-950 text-white flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-mono text-xs font-medium text-slate-400 tabular-nums">
            {service.number}
          </span>
        </div>

        <h3 className="font-display text-lg font-bold text-slate-950 tracking-tight">
          {service.name}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
          {service.shortDescription}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <Link
          to={`/services/${service.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
        >
          <span>Learn More</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
