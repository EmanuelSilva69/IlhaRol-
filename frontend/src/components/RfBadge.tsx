interface RfBadgeProps {
  screenNumber: string;
  screenTitle: string;
  rfs: string[];
  rnfs?: string[];
  userStories?: string[];
  description: string;
}

export function RfBadge({
  screenNumber,
  screenTitle,
  rfs,
  rnfs = [],
  userStories = [],
  description,
}: RfBadgeProps) {
  return (
    <section
      aria-label={`Requisitos atendidos na ${screenTitle}`}
      className="mb-6 border-2 border-black bg-amber-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-black px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white">
            {screenNumber}
          </span>
          <h2 className="text-sm font-black uppercase tracking-wide text-black sm:text-base">
            {screenTitle}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase text-neutral-700">
            RFs atendidos nesta tela:
          </span>
          {rfs.map((rf) => (
            <span
              key={rf}
              className="border border-black bg-emerald-200 px-2 py-0.5 text-xs font-black uppercase text-black"
            >
              {rf}
            </span>
          ))}
          {rnfs.map((rnf) => (
            <span
              key={rnf}
              className="border border-black bg-sky-200 px-2 py-0.5 text-xs font-bold uppercase text-black"
            >
              {rnf}
            </span>
          ))}
          {userStories.map((us) => (
            <span
              key={us}
              className="border border-black bg-purple-200 px-2 py-0.5 text-xs font-bold uppercase text-black"
            >
              {us}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-neutral-800">
        {description}
      </p>
    </section>
  );
}

export default RfBadge;