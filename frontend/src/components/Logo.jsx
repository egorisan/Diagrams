export default function Logo({ size = 'md', withText = true }) {
  const box = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const text = size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span className={`${box} grid grid-cols-2 gap-[2px]`}>
        <span className="rounded-[3px] bg-pink-400" />
        <span className="rounded-[3px] bg-pink-500 row-start-2" />
        <span className="rounded-[3px] bg-sky-400 row-start-2" />
        <span className="rounded-[3px] bg-sky-500 row-start-1 col-start-2 translate-y-[5px]" />
      </span>
      {withText && <span className={`font-bold text-slate-800 ${text}`}>24KT_Diagrams</span>}
    </span>
  );
}
