import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  Video, 
  History, 
  Settings as SettingsIcon, 
  Upload, 
  Loader2, 
  RefreshCcw, 
  AlertTriangle, 
  Download,
  Play,
  Trash2
} from 'lucide-react';

interface VideoGeneratorProps {
  hasProKey: boolean;
}

type View = 'generator' | 'history' | 'settings';

export function VideoGenerator({ hasProKey }: VideoGeneratorProps) {
  const [view, setView] = useState<View>('generator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [settings, setSettings] = useState({
    resolution: '720p',
    aspectRatio: '9:16',
    duration: '5s'
  });

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('kriptum_video_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedSettings = localStorage.getItem('kriptum_video_settings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch (e) {
      console.error("Erro ao carregar do localStorage", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('kriptum_video_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('kriptum_video_history', JSON.stringify(history));
  }, [history]);

  const handleGenerate = async () => {
    if (!prompt) return;
    if (!hasProKey) {
      setError("A geração de vídeo requer uma chave Google Cloud Pro configurada.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setStatusMessage("Iniciando Veo 3.1...");

    try {
      const manualKey = localStorage.getItem('kriptum_manual_api_key');
      const apiKey = manualKey || (process.env.GEMINI_API_KEY as string);

      if (!apiKey) {
        throw new Error("Chave da IA não encontrada. Por favor, configure no perfil.");
      }

      let imagePayload = undefined;
      if (imageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
        reader.readAsDataURL(imageFile);
        const base64Data = await base64Promise;
        imagePayload = {
          imageBytes: base64Data,
          mimeType: imageFile.type
        };
      }

      setStatusMessage("Enviando prompt para o Veo...");
      const ai = new GoogleGenAI({ apiKey });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: imagePayload,
        config: {
          numberOfVideos: 1,
          resolution: settings.resolution as any,
          aspectRatio: settings.aspectRatio as any
        }
      });

      setStatusMessage("Processando vídeo (pode levar alguns minutos)...");
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setStatusMessage("Ainda processando... Quase lá!");
        operation = await ai.operations.getVideosOperation({ operation: operation as any });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Falha ao obter o link do vídeo.");

      setStatusMessage("Finalizando download...");
      const videoResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });
      
      if (!videoResponse.ok) throw new Error("Falha ao baixar vídeo diretamente.");

      const blob = await videoResponse.blob();
      const videoUrl = URL.createObjectURL(blob);
      
      setGeneratedVideoUrl(videoUrl);
      
      const newVideo = {
        id: Date.now().toString(),
        prompt,
        url: videoUrl,
        createdAt: Date.now()
      };
      
      setHistory(prev => [newVideo, ...prev]);
      setStatusMessage("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro na geração de vídeo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
        {[
          { id: 'generator', label: 'Criar', icon: Video },
          { id: 'history', label: 'Galeria', icon: History },
          { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === tab.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-500 hover:text-slate-300'
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
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
                <div className="space-y-4">
                  <h4 className="font-black text-[10px] uppercase text-slate-500 tracking-widest">O que você quer criar?</h4>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-brand transition-all min-h-[120px] resize-none"
                    placeholder="Ex: Um robô futurista andando em uma metrópole neon, estilo cinematográfico..."
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Imagem de Referência (Opcional)</h4>
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:border-brand/50 transition-all group">
                      <Upload className="text-slate-600 group-hover:text-brand mb-2" size={24} />
                      <p className="text-[10px] font-black text-slate-500 uppercase">Upload de Imagem</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-slate-800">
                      <img src={imagePreview} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => {setImageFile(null); setImagePreview(null);}}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg text-white hover:bg-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={loading || !prompt}
                  className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {statusMessage || 'Gerando Vídeo...'}
                    </>
                  ) : (
                    <>
                      Gerar com Veo 3.1
                      <RefreshCcw size={16} />
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-2xl flex items-start gap-3 text-red-400">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              {generatedVideoUrl && (
                <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 space-y-4">
                  <video src={generatedVideoUrl} className="w-full rounded-2xl" controls autoPlay />
                  <a 
                    href={generatedVideoUrl} 
                    download="kriptum-video.mp4"
                    className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-800 flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Baixar Vídeo
                  </a>
                </div>
              )}
            </div>
          )}

          {view === 'history' && (
            <div className="space-y-4">
              {history.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {history.map((vid) => (
                    <div key={vid.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
                      <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
                        <video src={vid.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <Play className="text-white" size={32} />
                        </div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-500 uppercase">{new Date(vid.createdAt).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-300 line-clamp-1 italic">"{vid.prompt}"</p>
                        </div>
                        <button 
                          onClick={() => setHistory(prev => prev.filter(h => h.id !== vid.id))}
                          className="p-2 text-slate-500 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center opacity-30">
                  <Video size={40} className="mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum vídeo criado</p>
                </div>
              )}
            </div>
          )}

          {view === 'settings' && (
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-6">
              <div className="space-y-4">
                <h4 className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Resolução</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['720p', '1080p'].map(res => (
                    <button
                      key={res}
                      onClick={() => setSettings({...settings, resolution: res})}
                      className={`py-3 rounded-xl border font-black text-[10px] uppercase transition-all ${
                        settings.resolution === res ? 'bg-brand border-brand text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-[10px] uppercase text-slate-500 tracking-widest">Proporção</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['9:16', '16:9'].map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => setSettings({...settings, aspectRatio: ratio})}
                      className={`py-3 rounded-xl border font-black text-[10px] uppercase transition-all ${
                        settings.aspectRatio === ratio ? 'bg-brand border-brand text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
