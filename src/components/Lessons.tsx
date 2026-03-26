import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Play, 
  ChevronRight, 
  Search, 
  X,
  Clock,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string;
  thumbnail?: string;
  isLocked?: boolean;
  isCompleted?: boolean;
}

const ALL_LESSONS: Lesson[] = [
  {
    id: 'welcome',
    title: 'Aula 1: O Início da Jornada',
    description: 'Seja bem-vindo ao KRIPTUM PRO. O jogo mudou e agora você tem as ferramentas certas para chegar no topo.',
    duration: '00:41',
    videoUrl: 'https://youtube.com/shorts/tbDcWAHBpkM',
    thumbnail: 'https://img.youtube.com/vi/tbDcWAHBpkM/maxresdefault.jpg',
    isLocked: false,
    isCompleted: false
  },
  {
    id: 'crypto-adv',
    title: 'Estratégias de Engajamento',
    description: 'Aprenda a prender a atenção do seu público.',
    duration: '45:00',
    thumbnail: 'https://picsum.photos/seed/kriptum-engage/400/225',
    isLocked: true,
    isCompleted: false
  },
  {
    id: 'elite-networks',
    title: 'Monetização Avançada',
    description: 'Transforme seguidores em clientes reais.',
    duration: '30:00',
    thumbnail: 'https://picsum.photos/seed/kriptum-money/400/225',
    isLocked: true,
    isCompleted: false
  },
  {
    id: 'agile-dev',
    title: 'Criação de Conteúdo Viral',
    description: 'Os segredos por trás dos vídeos que explodem.',
    duration: '60:00',
    thumbnail: 'https://picsum.photos/seed/kriptum-viral/400/225',
    isLocked: true,
    isCompleted: false
  }
];

export function Lessons() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const filteredLessons = ALL_LESSONS.filter(lesson => 
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lesson.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Buscar aulas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-[#141414] border border-white/5 text-white rounded-2xl shadow-sm outline-none focus:border-brand transition-all placeholder:text-slate-600 font-medium text-sm"
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-white">
          {searchQuery ? `Resultados para "${searchQuery}"` : 'Módulos de Treinamento'}
        </h3>
        
        <div className="space-y-4">
          {filteredLessons.length > 0 ? (
            filteredLessons.map((lesson) => (
              <div 
                key={lesson.id} 
                onClick={() => !lesson.isLocked && setSelectedLesson(lesson)}
                className={`bg-[#141414] rounded-2xl border border-white/5 overflow-hidden transition-all cursor-pointer group hover:border-brand/50 ${lesson.isLocked ? 'opacity-60 grayscale' : ''}`}
              >
                <div className="relative aspect-video bg-[#0a0a0a]">
                  <img 
                    src={lesson.thumbnail} 
                    alt={lesson.title} 
                    className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {lesson.isLocked ? (
                      <Lock size={32} className="text-slate-600" />
                    ) : (
                      <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center shadow-lg shadow-brand/20 group-hover:scale-110 transition-transform">
                        <Play size={24} className="text-white ml-1" fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded-lg backdrop-blur-md">
                    <span className="text-[10px] font-bold text-white">{lesson.duration}</span>
                  </div>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-sm text-white">{lesson.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">{lesson.description}</p>
                  </div>
                  {lesson.isCompleted && (
                    <CheckCircle2 size={18} className="text-green-500 ml-2" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center space-y-2 opacity-40">
              <Search size={40} className="mx-auto mb-2 text-slate-700" />
              <p className="font-bold text-xs text-white">Nenhuma aula encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Lesson Player Modal */}
      <AnimatePresence>
        {selectedLesson && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          >
            <div className="p-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand/20 rounded-lg flex items-center justify-center border border-brand/30">
                  <BookOpen size={16} className="text-brand" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate max-w-[200px]">
                  {selectedLesson.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLesson(null)}
                className="p-2 bg-[#141414] rounded-xl text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="aspect-[9/16] bg-black w-full max-w-[400px] mx-auto overflow-hidden rounded-2xl shadow-2xl">
                {selectedLesson.videoUrl?.includes('youtube.com') || selectedLesson.videoUrl?.includes('youtu.be') ? (
                  <iframe 
                    src={selectedLesson.videoUrl.replace('shorts/', 'embed/').split('?')[0]}
                    className="w-full h-full"
                    title={selectedLesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video 
                    src={selectedLesson.videoUrl} 
                    className="w-full h-full" 
                    controls 
                    autoPlay 
                    playsInline
                  />
                )}
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-brand/10 text-brand text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Módulo 1
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <Clock size={12} />
                    {selectedLesson.duration}
                  </span>
                </div>
                <h2 className="text-xl font-display font-bold text-white">
                  {selectedLesson.title}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  {selectedLesson.description}
                </p>
                
                <div className="pt-6 border-t border-white/5">
                  <button 
                    onClick={() => setSelectedLesson(null)}
                    className="w-full py-4 gradient-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-brand/20"
                  >
                    Concluir Aula
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
