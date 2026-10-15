import { useEffect, useState } from 'react';

function isMobile() {
  const uaMobile = /Android|webOS|iPhone|iPod|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
  return uaMobile || window.innerWidth < 768;
}

export default function MobileBlocker({ children }) {
  const [blocked, setBlocked] = useState(isMobile);

  useEffect(() => {
    const onResize = () => setBlocked(isMobile());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">💻</div>
          <h1 className="text-xl font-bold text-white mb-2">24KT_Diagrams</h1>
          <p className="text-slate-300">
            Для редактирования диаграмм, пожалуйста, используйте компьютер или планшет.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
