import { useState } from 'react';
import { motion } from 'motion/react';
import { Image as LucideImageIcon, Download, Loader2, Sparkles, Wand2, X, AlertTriangle } from 'lucide-react';

interface Props {
  hasProKey: boolean;
}

export function ImageGenerator({ hasProKey }: Props) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const headers: any = { "Content-Type": "application/json" };
      const manualKey = localStorage.getItem('kriptum_manual_api_key');
      if (manualKey) headers['x-gemini-key'] = manualKey;

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: 'gemini-2.5-flash-image',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Gere uma imagem de alta qualidade baseada no seguinte prompt: ${prompt}. Estilo: Cinematográfico, detalhado, 4k.`,
                },
              ],
            }
          ]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro na ponte de segurança da IA.");
      }

      const responseData = await response.json();
      
      let foundImage = false;
      if (responseData.candidates && responseData.candidates[0].content.parts) {
        for (const part of responseData.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            setGeneratedImage(`data:image/png;base64,${base64Data}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error('Nenhuma imagem foi gerada pelo modelo.');
      }
    } catch (err: any) {
      console.error('Erro ao gerar imagem:', err);
      setError(err.message || 'Falha ao gerar imagem. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `kriptum-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-brand/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/20 rounded-xl flex items-center justify-center border border-brand/30">
              <LucideImageIcon size={20} className="text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Gerador de Imagem</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Criação Visual com IA</p>
            </div>
          </div>
          {hasProKey && (
            <div className="px-2 py-1 bg-brand/10 border border-brand/20 rounded-lg">
              <span className="text-[8px] font-black text-brand uppercase tracking-widest">Ultra HD</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição da Imagem</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Um astronauta futurista explorando um planeta de cristal..."
                className="w-full h-32 p-4 bg-slate-950 border border-slate-800 text-white rounded-2xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all placeholder:text-slate-700 resize-none text-sm"
              />
              <Wand2 size={16} className="absolute right-4 bottom-4 text-slate-700" />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-brand text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand/20 hover:bg-brand/90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processando Arsenal...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Gerar Imagem de Elite
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
        >
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-400 font-medium">{error}</p>
        </motion.div>
      )}

      {generatedImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="relative group rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="w-full h-auto object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
              <button
                onClick={downloadImage}
                className="w-full bg-white text-black p-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
              >
                <Download size={14} />
                Baixar Resultado
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setGeneratedImage(null)}
            className="w-full py-3 border border-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
          >
            <X size={14} />
            Limpar Arsenal
          </button>
        </motion.div>
      )}

      {!generatedImage && !isGenerating && (
        <div className="py-12 text-center space-y-4 opacity-30">
          <div className="w-16 h-16 bg-slate-900 rounded-3xl mx-auto flex items-center justify-center border border-slate-800">
            <LucideImageIcon size={32} className="text-slate-700" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Aguardando Comando</p>
        </div>
      )}
    </div>
  );
}
