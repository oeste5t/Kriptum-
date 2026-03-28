import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  History, 
  Settings as SettingsIcon, 
  Upload, 
  Loader2, 
  RefreshCcw, 
  AlertTriangle, 
  Check, 
  Copy,
  Trash2
} from 'lucide-react';

interface CaptionGeneratorProps {
}

type View = 'generator' | 'history' | 'settings';

export function CaptionGenerator({ }: CaptionGeneratorProps) {
  const [view, setView] = useState<View>('generator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [settings, setSettings] = useState({
    handle: '@kriptum',
    ctaModel: 'follow',
    autoSave: true
  });

  const ctaModels: any = {
    follow: (handle: string) => `siga ${handle} pra acompanhar a jornada`,
    save: (handle: string) => `salva esse post pra consultar depois e segue ${handle}`,
    share: (handle: string) => `manda esse conteúdo pra alguém e segue ${handle}`,
    comment: (handle: string) => `o que tu acha disso? comenta aqui e segue ${handle}`,
    growth: (handle: string) => `quer mais insights assim? segue ${handle}`
  };

  const addLog = (msg: string) => {
    console.log(`[KRIPTUM PRO] ${msg}`);
    setDebugLog(prev => [msg, ...prev].slice(0, 20));
  };

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('kriptum_caption_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedSettings = localStorage.getItem('kriptum_caption_settings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch (e) {
      console.error("Erro ao carregar do localStorage", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('kriptum_caption_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('kriptum_caption_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + 5; 
          if (prev < 90) return prev + 2; 
          return prev;
        });
      }, 200);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const captureFrame = async (): Promise<string | null> => {
    addLog("Iniciando captura...");
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        addLog("Refs não encontradas");
        return resolve(null);
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Configurações cruciais para mobile
      video.muted = true;
      video.playsInline = true;

      const onSeeked = async () => {
        try {
          addLog(`Seek concluído. ReadyState: ${video.readyState}. Aguardando 200ms...`);
          // Pequeno delay para garantir que o buffer do vídeo foi pintado na tela
          await new Promise(r => setTimeout(r, 200));

          const MAX_SIZE = 400;
          let width = video.videoWidth;
          let height = video.videoHeight;
          
          addLog(`Dimensões detectadas: ${width}x${height}`);
          
          if (!width || !height) {
            addLog("ERRO: Dimensões do vídeo são zero.");
            resolve(null);
            return;
          }

          if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          addLog(`Redimensionando canvas para: ${width}x${height}`);
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            addLog("Executando drawImage...");
            ctx.drawImage(video, 0, 0, width, height);
            
            addLog("Executando toDataURL...");
            const data = canvas.toDataURL('image/jpeg', 0.3).split(',')[1];
            
            if (!data || data.length < 10) {
              addLog("ERRO: toDataURL retornou dados inválidos.");
              resolve(null);
            } else {
              addLog(`Sucesso! Frame capturado: ~${Math.round(data.length / 1024)}KB`);
              resolve(data);
            }
          } else {
            addLog("ERRO: Falha ao obter Context 2D.");
            resolve(null);
          }
        } catch (e: any) {
          addLog("EXCEÇÃO na captura: " + e.message);
          resolve(null);
        } finally {
          video.removeEventListener('seeked', onSeekedWithCleanup);
        }
      };

      // Timeout aumentado para mobile (12s)
      const timeoutId = setTimeout(() => {
        video.removeEventListener('seeked', onSeekedWithCleanup);
        addLog("Timeout na captura de frame");
        resolve(null);
      }, 12000);

      const onSeekedWithCleanup = () => {
        clearTimeout(timeoutId);
        onSeeked();
      };

      video.addEventListener('seeked', onSeekedWithCleanup);
      
      // Tenta forçar o carregamento se necessário
      if (video.readyState >= 2) {
        const targetTime = video.duration ? Math.min(1.0, video.duration / 2) : 0.1;
        addLog(`Buscando tempo: ${targetTime}s`);
        video.currentTime = targetTime;
      } else {
        addLog("Aguardando carregamento do vídeo...");
        video.addEventListener('loadeddata', () => {
          const targetTime = video.duration ? Math.min(1.0, video.duration / 2) : 0.1;
          addLog(`Buscando tempo após carga: ${targetTime}s`);
          video.currentTime = targetTime;
        }, { once: true });
      }
    });
  };

  const handleGenerate = async () => {
    if (!videoFile) return;
    setLoading(true);
    setError(null);
    setGeneratedCaption(null);
    addLog("Iniciando geração de legenda...");
    addLog(`Arquivo: ${videoFile.name} (${Math.round(videoFile.size / 1024)}KB)`);
    addLog(`Tipo: ${videoFile.type}`);

    try {
      const base64Image = await captureFrame();
      if (!base64Image || base64Image.length < 100) {
        addLog("Falha na captura de frame: imagem vazia ou muito pequena");
        throw new Error("Não consegui capturar uma imagem válida do vídeo. Tente dar play e pausar em um momento claro.");
      }
      addLog("Frame capturado com sucesso");

      const systemPrompt = `Você é um redator de elite especializado em roteiros e legendas para vídeos curtos (Reels/TikTok).
      Analise a imagem do vídeo e crie uma legenda de alto impacto seguindo estas regras:
      1. Título curto e chamativo em minúsculas.
      2. 8 parágrafos de puro valor, sem emojis, focados em retenção e autoridade.
      3. Linguagem direta, "papo reto".
      4. 5 hashtags técnicas e relevantes.
      
      Você DEVE responder APENAS em formato JSON seguindo este esquema:
      {
        "titulo": "string",
        "paragrafos": ["string", "string", ...],
        "hashtags": "string"
      }`;

      addLog(`Enviando para o servidor...`);
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          systemInstruction: systemPrompt,
          userPrompt: "Analise este frame do vídeo e gere a legenda de elite em JSON seguindo as instruções do sistema."
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Resposta não-JSON recebida:", text);
        throw new Error(`O servidor retornou uma resposta inesperada (HTML). Verifique se o servidor está rodando corretamente.`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na resposta do servidor.");
      }

      const result = await response.json();
      const responseText = result.text;

      if (!responseText) {
        throw new Error("A IA não retornou uma resposta válida. Tente novamente.");
      }

      addLog(`Resposta recebida (${responseText.length} caracteres)`);

      let data;
      try {
        addLog("Tentando processar JSON...");
        data = JSON.parse(responseText.trim());
      } catch (e) {
        addLog("JSON.parse falhou, tentando extração via regex...");
        // Fallback: tenta extrair JSON se o modelo retornar texto extra
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          addLog("JSON extraído via regex com sucesso");
          data = JSON.parse(match[0]);
        } else {
          addLog("Falha total na extração de JSON");
          addLog("Texto bruto da IA: " + responseText.substring(0, 100) + "...");
          throw new Error("Erro ao processar os dados da IA. Tente novamente.");
        }
      }

      const finalCTA = ctaModels[settings.ctaModel](settings.handle);
      
      const fullCaption = {
        id: Date.now().toString(),
        title: (data.titulo || "sem título").toLowerCase(),
        body: Array.isArray(data.paragrafos) ? data.paragrafos.slice(0, 8) : ["Erro ao gerar parágrafos"],
        cta: finalCTA,
        hashtags: data.hashtags || "#foco #progresso #vibe #valor #lifestyle",
        createdAt: Date.now()
      };

      setGeneratedCaption(fullCaption);
      if (settings.autoSave) {
        setHistory(prev => [fullCaption, ...prev]);
      }
      setProgress(100);
      addLog("Geração concluída com sucesso");
    } catch (err: any) {
      console.error("Erro detalhado na geração:", err);
      let errorMsg = err.message || "Erro desconhecido na conexão com a IA.";
      
      if (errorMsg.includes("404") || errorMsg.includes("NOT_FOUND")) {
        errorMsg = "Modelo não encontrado ou Chave API inválida para este modelo. Verifique sua chave no perfil.";
      } else if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "Limite de uso da IA atingido. Tente novamente em alguns segundos.";
      } else if (errorMsg.includes("400") || errorMsg.includes("INVALID_ARGUMENT")) {
        errorMsg = "Erro nos dados enviados (talvez o vídeo seja incompatível). Tente outro vídeo.";
      }
      
      addLog(`Erro na geração: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        // Fallback robusto
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-[#141414] p-1 rounded-2xl border border-white/5">
        {[
          { id: 'generator', label: 'Gerar', icon: Plus },
          { id: 'history', label: 'Histórico', icon: History },
          { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              view === tab.id ? 'gradient-primary text-white shadow-lg shadow-brand/20' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >
          {view === 'generator' && (
            <div key="generator-view" className="space-y-6">
              <div className="bg-[#141414] rounded-2xl p-4 border border-white/5">
                {!videoPreview ? (
                  <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-brand/50 transition-all group">
                    <div className="w-16 h-16 bg-[#0a0a0a] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-slate-600 group-hover:text-brand" size={32} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carregar Vídeo</p>
                    <p className="text-[10px] text-slate-600 mt-1 italic font-medium">MP4, MOV ou WebM</p>
                    <input 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setVideoFile(file);
                          setVideoPreview(URL.createObjectURL(file));
                          setGeneratedCaption(null);
                          setError(null);
                          addLog(`Vídeo selecionado: ${file.name}`);
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-white/5">
                      <video 
                        ref={videoRef} 
                        src={videoPreview} 
                        className="w-full h-full object-contain" 
                        controls 
                        muted 
                        playsInline
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {setVideoFile(null); setVideoPreview(null); setGeneratedCaption(null); setError(null);}}
                        className="flex-1 py-4 bg-[#0a0a0a] text-slate-500 rounded-xl font-bold uppercase tracking-wider text-xs border border-white/5 hover:text-white transition-all"
                      >
                        Trocar Vídeo
                      </button>
                      <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex-[2] py-4 gradient-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-brand/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Gerando... {progress}%
                          </>
                        ) : (
                          <>
                            Gerar Legenda
                            <RefreshCcw size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-3 text-red-400">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              {generatedCaption && (
                <div className="space-y-4 animate-in slide-in-from-bottom-10">
                  <div className="bg-[#141414] rounded-2xl p-6 border border-white/5 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 gradient-primary" />
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-brand uppercase tracking-wider">{generatedCaption.title}</h4>
                      <button 
                        onClick={() => copyToClipboard(`${generatedCaption.title}\n\n${generatedCaption.body.join('\n\n')}\n\n${generatedCaption.cta}\n\n${generatedCaption.hashtags}`, generatedCaption.id)}
                        className="p-2 bg-[#0a0a0a] rounded-xl text-slate-500 hover:text-brand transition-all"
                      >
                        {copiedId === generatedCaption.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {generatedCaption.body.map((p: string, i: number) => (
                        <p key={i} className="text-xs text-slate-300 leading-relaxed font-medium">{p}</p>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-2">
                      <p className="text-xs font-bold text-white italic">"{generatedCaption.cta}"</p>
                      <p className="text-[10px] text-brand font-bold">{generatedCaption.hashtags}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'history' && (
            <div key="history-view" className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gerações Recentes</h4>
                <button 
                  onClick={() => setHistory([])}
                  className="text-xs font-bold text-red-500 uppercase tracking-wider hover:underline"
                >
                  Limpar Tudo
                </button>
              </div>
              
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((cap) => (
                    <div key={cap.id} className="bg-[#141414] rounded-2xl p-4 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">{new Date(cap.createdAt).toLocaleDateString()}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => copyToClipboard(`${cap.title}\n\n${cap.body.join('\n\n')}\n\n${cap.cta}\n\n${cap.hashtags}`, cap.id)}
                            className="p-2 bg-[#0a0a0a] rounded-lg text-slate-500"
                          >
                            {copiedId === cap.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                          <button 
                            onClick={() => setHistory(prev => prev.filter(h => h.id !== cap.id))}
                            className="p-2 bg-[#0a0a0a] rounded-lg text-slate-500 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <h5 className="text-xs font-bold text-brand uppercase">{cap.title}</h5>
                      <p className="text-xs text-slate-400 line-clamp-2 font-medium">{cap.body[0]}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center opacity-30">
                  <History size={40} className="mx-auto mb-2 text-white" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Nenhuma legenda salva</p>
                </div>
              )}
            </div>
          )}

          {view === 'settings' && (
            <div key="settings-view" className="space-y-6">
              <div className="bg-[#141414] rounded-2xl p-6 border border-white/5 space-y-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Identidade Visual</h4>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 ml-1">Seu @ no Instagram</label>
                    <input 
                      type="text" 
                      value={settings.handle} 
                      onChange={(e) => setSettings({...settings, handle: e.target.value})} 
                      className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl p-4 text-white text-sm font-bold outline-none focus:border-brand transition-all" 
                      placeholder="@seuusuario"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Modelo de CTA</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.keys(ctaModels).map(k => (
                      <button
                        key={k}
                        onClick={() => setSettings({...settings, ctaModel: k})}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          settings.ctaModel === k 
                            ? 'bg-brand/10 border-brand text-brand' 
                            : 'bg-[#0a0a0a] border-white/5 text-slate-500'
                        }`}
                      >
                        <p className="text-xs font-bold uppercase mb-1">{k}</p>
                        <p className="text-[10px] opacity-70 italic font-medium">"{ctaModels[k](settings.handle)}"</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white">Salvar Automático</p>
                      <p className="text-xs text-slate-500 font-medium">Manter histórico de gerações</p>
                    </div>
                    <button 
                      onClick={() => setSettings({...settings, autoSave: !settings.autoSave})}
                      className={`w-12 h-6 rounded-full transition-all relative ${settings.autoSave ? 'gradient-primary' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoSave ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-[10px] uppercase text-slate-500 tracking-widest">Logs de Sistema (Debug)</h4>
                      <button 
                        onClick={() => setDebugLog([])}
                        className="text-[10px] font-bold text-slate-600 uppercase hover:text-white transition-colors"
                      >
                        Limpar Logs
                      </button>
                    </div>
                    <div className="bg-[#0a0a0a] rounded-xl p-3 border border-white/5 max-h-40 overflow-y-auto font-mono text-[10px] space-y-1">
                      {debugLog.length > 0 ? (
                        debugLog.map((log, i) => (
                          <div key={i} className="text-slate-500">
                            <span className="text-brand/50 mr-2">[{debugLog.length - 1 - i}]</span>
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-700 italic">Nenhum log registrado</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
