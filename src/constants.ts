export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string;
  thumbnail?: string;
  isLocked?: boolean;
  isCompleted?: boolean;
}

export const ALL_LESSONS: Lesson[] = [
  {
    id: 'welcome',
    title: 'Aula 1: O Início da Jornada',
    description: 'Comece aqui sua jornada no KRIPTUM PRO. Aprenda os primeiros passos para dominar o arsenal.',
    duration: '00:59',
    videoUrl: 'https://youtube.com/shorts/uNm7Zqc2RSA',
    thumbnail: 'https://img.youtube.com/vi/uNm7Zqc2RSA/maxresdefault.jpg',
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
