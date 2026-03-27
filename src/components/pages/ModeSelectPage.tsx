import Icon from '@/components/ui/icon';

interface ModeSelectPageProps {
  onSelectSolo: () => void;
  onSelectMultiplayer: () => void;
}

export default function ModeSelectPage({ onSelectSolo, onSelectMultiplayer }: ModeSelectPageProps) {
  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, transparent, #d4a843)' }} />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-oswald">Выбери режим</span>
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, transparent, #d4a843)' }} />
          </div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-gradient-gold mb-3">
            Как будем играть?
          </h1>
          <p className="text-gray-500 font-oswald font-light text-sm">
            Выбери режим и покажи свои знания кино
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up delay-200">
          <button
            onClick={onSelectSolo}
            className="card-cinema rounded p-8 text-left group hover:border-gold/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(212,168,67,0.06) 0%, transparent 70%)',
            }} />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded flex items-center justify-center mb-5" style={{
                background: 'linear-gradient(135deg, rgba(212,168,67,0.15), rgba(212,168,67,0.05))',
                border: '1px solid rgba(212,168,67,0.2)',
              }}>
                <Icon name="User" size={24} className="text-gold" />
              </div>
              <h3 className="font-playfair text-2xl font-bold text-white mb-2 group-hover:text-gold transition-colors">
                Одиночная игра
              </h3>
              <p className="text-gray-500 text-sm font-oswald font-light leading-relaxed mb-6">
                Проходи раунды по 10 вопросов. Каждый раунд — новые фильмы. Играй пока не потеряешь все жизни!
              </p>
              <div className="flex items-center gap-2 text-gold text-sm font-oswald tracking-wider">
                <span>Начать</span>
                <Icon name="ArrowRight" size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          <button
            onClick={onSelectMultiplayer}
            className="card-cinema rounded p-8 text-left group hover:border-gold/30 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(212,168,67,0.06) 0%, transparent 70%)',
            }} />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded flex items-center justify-center mb-5" style={{
                background: 'linear-gradient(135deg, rgba(212,168,67,0.15), rgba(212,168,67,0.05))',
                border: '1px solid rgba(212,168,67,0.2)',
              }}>
                <Icon name="Users" size={24} className="text-gold" />
              </div>
              <h3 className="font-playfair text-2xl font-bold text-white mb-2 group-hover:text-gold transition-colors">
                Сетевая игра
              </h3>
              <p className="text-gray-500 text-sm font-oswald font-light leading-relaxed mb-6">
                Дуэль 1 на 1. Те же кадры, 10 секунд на ответ. Проиграет тот, у кого закончатся жизни!
              </p>
              <div className="flex items-center gap-2 text-gold text-sm font-oswald tracking-wider">
                <span>Играть</span>
                <Icon name="Swords" size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
