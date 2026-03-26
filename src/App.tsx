/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  BookOpen, 
  Wrench, 
  Bell, 
  User,
  LogOut,
  Play,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Calculator,
  Calendar,
  FileText,
  Plus,
  History,
  Settings as SettingsIcon,
  ArrowRight,
  Trash2,
  RefreshCcw,
  Cpu,
  Database,
  Hash,
  Copy,
  Check,
  Upload,
  Loader2,
  Video,
  Image as LucideImageIcon,
  Download,
  AlertTriangle,
  X,
  Mail,
  Info
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CaptionGenerator } from './components/CaptionGenerator';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageGenerator } from './components/ImageGenerator';
import { Lessons } from './components/Lessons';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  onSnapshot, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  FirebaseUser,
  handleFirestoreError,
  OperationType
} from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

// --- Tipos ---
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type Tab = 'inicio' | 'aulas' | 'ferramentas' | 'clips' | 'configuracoes' | 'notificacoes';
type ToolId = 'none' | 'legenda' | 'video' | 'imagem' | 'calculadora' | 'calendario' | 'notas';

// --- Componente de Logo Kriptum ---
function KriptumLogo({ size = 24, className = "", rounded = "rounded-2xl" }: { size?: number, className?: string, rounded?: string }) {
  return (
    <div className={`flex items-center justify-center relative ${className}`} style={{ width: size, height: size }}>
      {/* Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#f472b6] to-[#c084fc] blur-xl animate-pulse opacity-50" />
      
      {/* Logo Box */}
      <div className={`relative w-full h-full bg-[#141414] border border-white/10 ${rounded} flex items-center justify-center shadow-lg overflow-hidden`}>
        <img 
          src="/icon-192.png" 
          alt="Logo" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [activeTool, setActiveTool] = useState<ToolId>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasProKey, setHasProKey] = useState(false);
  const [manualApiKey, setManualApiKey] = useState<string>('');
  const [lowPerfMode, setLowPerfMode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Create or update user profile in Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const newUser = {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              role: currentUser.email === 'perigoreal00@gmail.com' ? 'admin' : 'user',
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newUser);
            setUserRole(newUser.role as any);
          } else {
            const currentRole = userSnap.data().role;
            if (currentUser.email === 'perigoreal00@gmail.com' && currentRole !== 'admin') {
              // Force admin role for the owner
              await setDoc(userRef, { role: 'admin' }, { merge: true });
              setUserRole('admin');
            } else {
              setUserRole(currentRole);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Settings persistence
  useEffect(() => {
    const savedPerf = localStorage.getItem('lowPerfMode');
    if (savedPerf === 'true') setLowPerfMode(true);
    
    const savedKey = localStorage.getItem('kriptum_manual_api_key');
    if (savedKey) setManualApiKey(savedKey);
    
    checkApiKey();

    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Check for Service Worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      });
    }
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Se não houver prompt, podemos mostrar uma mensagem mais amigável ou tentar orientar o usuário
      // mas o usuário quer algo "direto". Infelizmente sem o evento do browser não dá pra forçar a instalação nativa,
      // então vamos manter uma mensagem de feedback rápido.
      setErrorMessage('O instalador está sendo preparado pelo seu navegador. Tente em instantes.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    localStorage.setItem('lowPerfMode', lowPerfMode.toString());
    if (lowPerfMode) {
      document.documentElement.classList.add('low-perf');
    } else {
      document.documentElement.classList.remove('low-perf');
    }
  }, [lowPerfMode]);

  const checkApiKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasProKey(hasKey);
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasProKey(true);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Profile update is handled by the auth listener in useEffect
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Email Auth Error:', error);
      setLoginError(true);
      // Exibe a mensagem de erro real do Firebase para ajudar no diagnóstico
      setErrorMessage(error.message || 'Erro na autenticação.');
      setTimeout(() => setLoginError(false), 5000);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login Error:', error);
      setLoginError(true);
      setErrorMessage('Falha ao entrar com Google.');
      setTimeout(() => setLoginError(false), 3000);
    }
  };

  const handleSaveManualKey = (key: string) => {
    setManualApiKey(key);
    localStorage.setItem('kriptum_manual_api_key', key);
    // Refresh the diagnostic check
    window.dispatchEvent(new CustomEvent('kriptum_key_updated'));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  // Real-time Notifications Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user]);

  const handleSendNotification = async (title: string, description: string, type: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        description,
        type,
        authorName: user?.displayName || 'Comando KRIPTUM PRO',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="text-brand animate-spin" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 font-sans max-w-md mx-auto relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-8 z-10"
        >
          {/* Logo & Title */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <KriptumLogo size={48} />
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">KRIPTUM<span className="font-normal">PRO</span></h1>
          </div>

          <div className="text-center space-y-2 mb-8">
            <h2 className="text-4xl font-display font-bold text-white tracking-tight">Bem-vindo!</h2>
            <p className="text-slate-400 text-sm">
              O Arsenal de Inteligência Artificial definitivo.
            </p>
          </div>

          <div className="space-y-5">
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="email" 
                    placeholder="seu@email.com"
                    className="w-full p-4 pl-12 bg-[#141414] border border-white/5 text-white rounded-2xl focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all placeholder:text-slate-600 font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Senha</label>
                  <button type="button" className="text-xs font-medium text-[#f472b6] hover:text-[#c084fc] transition-colors">
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full p-4 pl-12 bg-[#141414] border border-white/5 text-white rounded-2xl focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all placeholder:text-slate-600 tracking-widest"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full gradient-primary text-white p-4 rounded-full font-display font-bold text-lg shadow-lg shadow-brand/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center mt-2"
              >
                {isRegistering ? 'Criar Conta' : 'Entrar'}
              </button>
            </form>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-500 tracking-widest">OU CONTINUE COM</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-[#1a1a1a] border border-white/5 text-white p-4 rounded-full font-display font-medium shadow-lg hover:bg-[#222] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continuar com Google
            </button>
          </div>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-center"
            >
              <p className="text-xs font-bold text-red-500 tracking-wide">
                {errorMessage || 'Falha na Autenticação'}
              </p>
            </motion.div>
          )}

          <div className="pt-8 space-y-6 text-center">
            <p className="text-sm text-slate-400">
              Ainda não tem conta? <button onClick={() => setIsRegistering(!isRegistering)} className="text-[#f472b6] font-medium hover:text-[#c084fc] transition-colors">{isRegistering ? 'Fazer login' : 'Criar agora'}</button>
            </p>
            
            <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
              <button className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[10px]">?</div>
                Precisa de ajuda?
              </button>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <button className="hover:text-slate-300 transition-colors">Termos & Privacidade</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0a] font-sans text-slate-100 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden border-x border-white/5">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
          <button className="text-white hover:text-brand transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          
          <div className="flex items-center gap-2">
            <KriptumLogo size={28} rounded="rounded-lg" />
            <h1 className="text-xl font-display font-bold tracking-tight text-white">
              KRIPTUM<span className="font-normal">PRO</span>
            </h1>
            {hasProKey && (
              <span className="text-[8px] font-black text-brand uppercase tracking-[0.2em] mt-0.5">Pro</span>
            )}
          </div>

          <button 
            onClick={() => setActiveTab('notificacoes')}
            className="relative text-white hover:text-brand transition-colors"
          >
            <Bell size={24} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>
            )}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (activeTab === 'ferramentas' ? activeTool : '')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: lowPerfMode ? 0 : 0.15 }}
              className="p-6 space-y-6"
            >
              {activeTab === 'inicio' && (
                <HomeView 
                  user={user} 
                  notificationsCount={notifications.length} 
                  onSelectTab={setActiveTab} 
                  deferredPrompt={deferredPrompt}
                  onInstall={handleInstall}
                />
              )}
              {activeTab === 'aulas' && <Lessons />}
              {activeTab === 'ferramentas' && (
                activeTool === 'none' ? (
                  <ToolsView onSelectTool={setActiveTool} />
                ) : (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setActiveTool('none')}
                      className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-brand transition-colors"
                    >
                      <ChevronRight size={16} className="rotate-180" />
                      Voltar às Ferramentas
                    </button>
                    {activeTool === 'legenda' && <CaptionGenerator hasProKey={hasProKey} />}
                    {activeTool === 'video' && <VideoGenerator hasProKey={hasProKey} />}
                    {activeTool === 'imagem' && <ImageGenerator hasProKey={hasProKey} />}
                    {activeTool !== 'legenda' && activeTool !== 'video' && activeTool !== 'imagem' && (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-[#141414] rounded-3xl mx-auto flex items-center justify-center border border-white/5">
                          <Wrench size={40} className="text-slate-700" />
                        </div>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Em desenvolvimento</p>
                      </div>
                    )}
                  </div>
                )
              )}
              {activeTab === 'clips' && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-[#141414] rounded-3xl mx-auto flex items-center justify-center border border-white/5">
                    <Video size={40} className="text-slate-700" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-white">Clips</h2>
                  <p className="text-slate-500 font-medium text-sm">Em breve você poderá ver seus clips aqui.</p>
                </div>
              )}
              {activeTab === 'notificacoes' && (
                <div className="space-y-8">
                  <NotificationsView 
                    notifications={notifications} 
                    userRole={userRole} 
                    onDelete={handleDeleteNotification} 
                  />
                  {userRole === 'admin' && (
                    <AdminCommandCenter onSend={handleSendNotification} />
                  )}
                </div>
              )}
              {activeTab === 'configuracoes' && (
                <SettingsView 
                  user={user}
                  userRole={userRole}
                  lowPerfMode={lowPerfMode} 
                  setLowPerfMode={setLowPerfMode} 
                  hasProKey={hasProKey} 
                  manualApiKey={manualApiKey}
                  onSaveManualKey={handleSaveManualKey}
                  onOpenKeySelector={handleOpenKeySelector}
                  deferredPrompt={deferredPrompt}
                  onInstall={handleInstall}
                  onLogout={handleLogout}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-white/5 px-4 py-3 flex justify-between items-center z-20 pb-safe">
          {[
            { id: 'inicio', icon: Home, label: 'Home' },
            { id: 'aulas', icon: BookOpen, label: 'Aulas' },
            { id: 'ferramentas', icon: Wrench, label: 'Ferramentas' },
            { id: 'clips', icon: Video, label: 'Clips' },
            { id: 'configuracoes', icon: User, label: 'Perfil' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`flex flex-col items-center gap-1 transition-all duration-200 w-16 ${
                  isActive ? 'text-brand' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Update Notification */}
        <AnimatePresence>
          {updateAvailable && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-20 left-6 right-6 z-50 bg-brand p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/20"
            >
              <div className="flex items-center gap-3">
                <RefreshCcw className="text-white animate-spin-slow" size={20} />
                <div>
                  <p className="text-white font-display font-black text-[10px] uppercase tracking-widest leading-none">Nova Versão</p>
                  <p className="text-white/80 text-[8px] font-bold uppercase tracking-widest mt-1">Atualização do Arsenal disponível</p>
                </div>
              </div>
              <button 
                onClick={handleRefresh}
                className="bg-white text-brand px-4 py-2 rounded-xl font-display font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                Atualizar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

// --- Views das Abas ---

function HomeView({ user, notificationsCount, onSelectTab, deferredPrompt, onInstall }: { user: any, notificationsCount: number, onSelectTab: (tab: Tab) => void, deferredPrompt: any, onInstall: () => void }) {
  return (
    <div className="space-y-8">
      {/* Welcome Section with Logo */}
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <KriptumLogo size={80} rounded="rounded-3xl" />
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Olá, {user?.displayName?.split(' ')[0] || 'Criador'}!</h2>
          <p className="text-slate-400 text-sm font-medium">Seu arsenal de elite está pronto.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar..."
          className="w-full p-4 pl-12 bg-[#141414] border border-white/5 text-white rounded-2xl focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all placeholder:text-slate-600 font-medium"
        />
      </div>

      {/* Aulas Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-bold text-lg text-white">Aulas</h3>
          <button onClick={() => onSelectTab('aulas')} className="text-sm font-medium text-brand hover:text-brand-glow transition-colors">Ver todas</button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[240px] snap-center bg-[#141414] rounded-2xl border border-white/5 overflow-hidden group cursor-pointer" onClick={() => onSelectTab('aulas')}>
              <div className="h-32 bg-slate-800 relative overflow-hidden">
                <img src={`https://picsum.photos/seed/aula${i}/400/200`} alt={`Aula ${i}`} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <Play size={16} className="text-white ml-1" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] font-medium text-white backdrop-blur-md">
                  12:45
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-display font-bold text-sm text-white mb-1">Como viralizar no Reels</h4>
                <p className="text-xs text-slate-500">Módulo {i} • Aula {i}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ferramentas Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-bold text-lg text-white">Ferramentas</h3>
          <button onClick={() => onSelectTab('ferramentas')} className="text-sm font-medium text-brand hover:text-brand-glow transition-colors">Ver todas</button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div onClick={() => onSelectTab('ferramentas')} className="bg-[#141414] p-5 rounded-2xl border border-white/5 flex flex-col items-center gap-3 cursor-pointer hover:border-brand/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <span className="font-display font-bold text-xs text-center text-white">Gerador de Legenda</span>
          </div>
          <div onClick={() => onSelectTab('ferramentas')} className="bg-[#141414] p-5 rounded-2xl border border-white/5 flex flex-col items-center gap-3 cursor-pointer hover:border-brand/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
              <Video size={24} />
            </div>
            <span className="font-display font-bold text-xs text-center text-white">Gerador de Vídeo</span>
          </div>
          <div onClick={() => onSelectTab('ferramentas')} className="bg-[#141414] p-5 rounded-2xl border border-white/5 flex flex-col items-center gap-3 cursor-pointer hover:border-brand/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
              <LucideImageIcon size={24} />
            </div>
            <span className="font-display font-bold text-xs text-center text-white">Gerador de Imagem</span>
          </div>
          <div onClick={() => onSelectTab('ferramentas')} className="bg-[#141414] p-5 rounded-2xl border border-white/5 flex flex-col items-center gap-3 cursor-pointer hover:border-brand/30 transition-all group">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
              <Calculator size={24} />
            </div>
            <span className="font-display font-bold text-xs text-center text-white">Calculadora</span>
          </div>
        </div>
      </section>

      {/* Install Prompt */}
      {deferredPrompt && (
        <section className="bg-gradient-to-r from-brand/20 to-purple-500/20 p-6 rounded-2xl border border-brand/30 flex items-center justify-between">
          <div>
            <h4 className="font-display font-bold text-white text-sm mb-1">Instale o App</h4>
            <p className="text-xs text-slate-400">Acesso mais rápido e fácil.</p>
          </div>
          <button 
            onClick={onInstall}
            className="bg-brand text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Download size={14} />
            Instalar
          </button>
        </section>
      )}
    </div>
  );
}

// Remove the old ClassesView as it's now in its own file
// function ClassesView() { ... }

function ToolsView({ onSelectTool }: { onSelectTool: (id: ToolId) => void }) {
  const tools = [
    { id: 'legenda', name: 'Gerador Legenda', icon: FileText, color: 'bg-brand/10 text-brand border-brand/30' },
    { id: 'video', name: 'Gerador Vídeo', icon: Video, color: 'bg-brand/10 text-brand border-brand/30' },
    { id: 'imagem', name: 'Gerador Imagem', icon: LucideImageIcon, color: 'bg-brand/10 text-brand border-brand/30' },
    { id: 'calculadora', name: 'Calculadora', icon: Calculator, color: 'bg-slate-800 text-slate-400 border-white/5' },
    { id: 'calendario', name: 'Calendário', icon: Calendar, color: 'bg-slate-800 text-slate-400 border-white/5' },
    { id: 'notas', name: 'Anotações', icon: FileText, color: 'bg-slate-800 text-slate-400 border-white/5' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <KriptumLogo size={32} rounded="rounded-xl" />
        <h3 className="font-display font-bold text-lg text-white">Ferramentas</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
          {tools.map((tool, i) => {
            const Icon = tool.icon as any;
            return (
              <button 
                key={i} 
                onClick={() => onSelectTool(tool.id as ToolId)}
                className={`p-5 rounded-2xl border border-white/5 bg-[#141414] flex flex-col items-center gap-3 shadow-sm hover:border-brand/30 transition-all active:scale-95 group`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${tool.color.split(' ')[0]} ${tool.color.split(' ')[1]}`}>
                  <Icon size={24} />
                </div>
                <span className="font-display font-bold text-xs text-center text-white">{tool.name}</span>
              </button>
            );
          })}
      </div>
      
      <div className="bg-brand/5 p-6 rounded-2xl border border-brand/20 text-center space-y-2">
        <h4 className="font-display font-bold text-brand text-sm">Acesso Restrito</h4>
        <p className="text-xs text-brand/70 font-medium">Novas ferramentas de elite serão desbloqueadas em breve.</p>
      </div>
    </div>
  );
}

function NotificationsView({ notifications, userRole, onDelete }: { notifications: any[], userRole: string, onDelete: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg text-white">Notificações</h3>
        {userRole === 'admin' && (
          <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded-full uppercase tracking-wider border border-brand/20">
            Admin
          </span>
        )}
      </div>
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-[#141414]">
            <p className="text-sm text-slate-500 font-medium">Nenhuma notificação no momento</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div key={n.id || i} className={`p-4 rounded-2xl border ${n.type === 'alert' ? 'bg-red-500/5 border-red-500/20' : 'bg-[#141414] border-white/5'} flex gap-4 relative`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 ${n.type === 'alert' ? 'bg-red-500' : 'bg-brand shadow-[0_0_8px_rgba(217,70,239,0.5)]'}`} />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-white">{n.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Agora'}
                    </span>
                    {userRole === 'admin' && n.id && (
                      <button 
                        onClick={() => {
                          if (window.confirm('Deseja realmente excluir este aviso?')) {
                            onDelete(n.id);
                          }
                        }}
                        className="p-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Excluir Aviso"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mt-1">{n.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
                    <User size={10} className="text-slate-400" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{n.authorName || 'Sistema'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminCommandCenter({ onSend }: { onSend: (t: string, d: string, ty: string) => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('update');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !desc) return;
    onSend(title, desc, type);
    setTitle('');
    setDesc('');
  };

  return (
    <div className="bg-brand/5 p-6 rounded-2xl border border-brand/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand">
          <Cpu size={18} />
          <h3 className="font-display font-bold text-sm uppercase tracking-wider">Painel Admin</h3>
        </div>
        <KriptumLogo size={24} rounded="rounded-lg" />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          placeholder="Título da Notificação"
          className="w-full bg-[#141414] border border-white/5 p-3 rounded-xl text-sm text-white outline-none focus:border-brand transition-all"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea 
          placeholder="Mensagem..."
          className="w-full bg-[#141414] border border-white/5 p-3 rounded-xl text-sm text-white outline-none focus:border-brand transition-all h-24 resize-none"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <div className="flex gap-2">
          {['update', 'alert', 'info'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 p-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${type === t ? 'bg-brand text-white border-brand' : 'bg-[#141414] text-slate-500 border-white/5 hover:border-white/10'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button 
          type="submit"
          className="w-full gradient-primary text-white p-3 rounded-xl font-display font-bold text-sm uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Enviar Notificação
        </button>
      </form>
    </div>
  );
}

function SettingsView({ user, userRole, manualApiKey, onSaveManualKey, onLogout, deferredPrompt, onInstall }: any) {
  const [systemStatus, setSystemStatus] = useState<{ apiKeyConfigured: boolean, apiKeyLength: number } | null>(null);
  const [tempKey, setTempKey] = useState(manualApiKey);
  const [showKeyInput, setShowKeyInput] = useState(false);

  const checkStatus = async () => {
    if (userRole !== 'admin') return;
    try {
      const headers: any = { "Content-Type": "application/json" };
      const savedKey = localStorage.getItem('kriptum_manual_api_key');
      if (savedKey) headers['x-gemini-key'] = savedKey;

      const response = await fetch('/api/system/status', { headers });
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (e) {
      console.error("Erro ao checar status do sistema:", e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [userRole]);

  const handleSave = () => {
    onSaveManualKey(tempKey);
    setShowKeyInput(false);
    setTimeout(checkStatus, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg text-white">Perfil</h3>
        <KriptumLogo size={32} rounded="rounded-xl" />
      </div>
      
      <div className="bg-[#141414] rounded-2xl p-6 border border-white/5 space-y-6">
        {/* User Profile */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-brand/30 bg-slate-800">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={32} className="text-slate-600" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-display font-bold text-white text-lg leading-tight">{user?.displayName || 'Usuário'}</h4>
            <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-wider rounded-md border border-brand/20">
              {userRole === 'admin' ? 'Admin' : 'Membro PRO'}
            </span>
          </div>
        </div>

        {/* Admin Section - Only for you */}
        {userRole === 'admin' && (
          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-brand" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Configuração de IA</h4>
              </div>
              <button 
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-[10px] font-bold text-brand uppercase tracking-wider bg-brand/10 px-3 py-1 rounded-lg border border-brand/20"
              >
                {showKeyInput ? 'Cancelar' : 'Ajustar Chave'}
              </button>
            </div>

            {showKeyInput && (
              <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 space-y-3">
                <input 
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="Cole sua Chave Gemini API"
                  className="w-full p-3 bg-[#141414] border border-white/5 text-white rounded-xl text-xs font-mono outline-none focus:border-brand transition-all"
                />
                <button 
                  onClick={handleSave}
                  className="w-full gradient-primary text-white p-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                >
                  Salvar Chave
                </button>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${systemStatus?.apiKeyConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Motor IA</span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${systemStatus?.apiKeyConfigured ? 'text-green-400' : 'text-red-400'}`}>
                {systemStatus?.apiKeyConfigured ? 'Operacional' : 'Offline'}
              </span>
            </div>
          </div>
        )}

        {/* PWA Support */}
        {deferredPrompt ? (
          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <Download size={16} />
              <h4 className="text-xs font-bold uppercase tracking-wider">Instalar Aplicativo</h4>
            </div>
            
            <button 
              onClick={onInstall}
              className="w-full gradient-primary text-white p-4 rounded-xl font-display font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Instalar Agora
            </button>
          </div>
        ) : (
          <div className="pt-6 border-t border-white/5 space-y-4">
             <div className="flex items-center gap-2 text-slate-400">
              <Info size={16} />
              <h4 className="text-xs font-bold uppercase tracking-wider">Como Instalar</h4>
            </div>
            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-white/5 space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Para instalar no <span className="text-white font-bold">iOS (iPhone)</span>, toque no ícone de <span className="text-brand font-bold">Compartilhar</span> no Safari e selecione <span className="text-white font-bold">"Adicionar à Tela de Início"</span>.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                No <span className="text-white font-bold">Android</span>, se o botão não aparecer, toque nos <span className="text-brand font-bold">três pontos</span> do Chrome e selecione <span className="text-white font-bold">"Instalar Aplicativo"</span>.
              </p>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full bg-red-500/10 text-red-500 p-4 rounded-xl font-display font-bold uppercase tracking-wider border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-3"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </div>

      <div className="text-center opacity-30">
        <p className="text-[10px] font-bold uppercase tracking-widest">KRIPTUM PRO v1.0.2</p>
      </div>
    </div>
  );
}

// --- Fim do Arquivo ---
