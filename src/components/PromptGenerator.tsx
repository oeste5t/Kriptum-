import React, { useState } from 'react';
import { 
  UserPlus, 
  Sparkles, 
  Copy, 
  Trash2, 
  Plus, 
  Clapperboard,
  CheckCircle2,
  Loader2,
  Shirt,
  Film,
  MapPin,
  Settings,
  Zap,
  AlertTriangle
} from 'lucide-react';

const PromptGenerator = () => {
  const [characters, setCharacters] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [selectedChar, setSelectedChar] = useState<any>(null);
  const [scenes, setScenes] = useState([""]); 
  const [globalEnvironment, setGlobalEnvironment] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copyStatus, setCopyStatus] = useState(false);

  const [newChar, setNewChar] = useState({
    nome: "",
    idade: "",
    genero: "",
    nacionalidade: "",
    estiloRoupa: ""
  });

  const [error, setError] = useState<string | null>(null);

  // Função de chamada à API usando SDK no Backend
  const callGemini = async (prompt: string, systemInstruction: string, responseSchema?: any) => {
    setError(null);
    try {
      const response = await fetch('/api/generate/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          responseSchema
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
        throw new Error("A IA não retornou uma resposta válida. Verifique sua chave API.");
      }

      const rawText = responseText.trim();

      if (responseSchema) {
        try {
          return JSON.parse(rawText);
        } catch (e) {
          // Fallback: tenta extrair JSON se o modelo retornar texto extra
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
          throw new Error("Erro ao processar resposta da IA. Tente novamente.");
        }
      }
      return rawText;
    } catch (error: any) {
      console.error("Erro na chamada Gemini:", error);
      throw error;
    }
  };

  // Expansão Automática de Personagem
  const createCharacter = async () => {
    if (!newChar.nome) return;
    setIsCreating(true);

    const systemPrompt = `Você é um Designer de Personagens Senior. 
    Sua missão é receber dados básicos e EXPANDIR para uma ficha técnica detalhada.
    
    REGRAS:
    1. ROUPA: Descreva tecidos e caimento de luxo.
    2. ROSTO: Descreva traços marcantes e realistas.
    3. CABELO: Descreva estilo e movimento.
    
    Retorne um JSON com:
    - Identidade: { Nome, Gênero, Idade, Nacionalidade }
    - Fisico: { Corpo, Rosto, Olhos, Cabelo }
    - Vestuario: { DetalheDaRoupa, Sapatos, Acessorios }
    - Fotografia: { Lente, Iluminação, Atmosfera }`;

    const userPrompt = `Expanda este personagem básico para uma ficha completa:
    Nome: ${newChar.nome}, Idade: ${newChar.idade}, Gênero: ${newChar.genero}, Nacionalidade: ${newChar.nacionalidade}. 
    Estilo de Roupa: ${newChar.estiloRoupa || "Elegante sofisticado"}`;

    const schema = {
      type: "OBJECT",
      properties: {
        Identidade: {
          type: "OBJECT",
          properties: {
            Nome: { type: "STRING" },
            Gênero: { type: "STRING" },
            Idade: { type: "STRING" },
            Nacionalidade: { type: "STRING" }
          }
        },
        Fisico: {
          type: "OBJECT",
          properties: {
            Corpo: { type: "STRING" },
            Rosto: { type: "STRING" },
            Olhos: { type: "STRING" },
            Cabelo: { type: "STRING" }
          }
        },
        Vestuario: {
          type: "OBJECT",
          properties: {
            DetalheDaRoupa: { type: "STRING" },
            Sapatos: { type: "STRING" },
            Acessorios: { type: "STRING" }
          }
        },
        Fotografia: {
          type: "OBJECT",
          properties: {
            Lente: { type: "STRING" },
            Iluminação: { type: "STRING" },
            Atmosfera: { type: "STRING" }
          }
        }
      }
    };

    try {
      const fullSheet = await callGemini(userPrompt, systemPrompt, schema);
      
      if (!fullSheet || typeof fullSheet !== 'object') {
        throw new Error("A IA retornou dados inválidos.");
      }

      const characterWithId = { 
        ...fullSheet, 
        id: Date.now(),
        // Garantindo que Identidade existe para evitar erros de renderização
        Identidade: fullSheet.Identidade || { Nome: newChar.nome, Nacionalidade: newChar.nacionalidade }
      };

      setCharacters(prev => [...prev, characterWithId]);
      setIsCreating(false);
      setNewChar({ nome: "", idade: "", genero: "", nacionalidade: "", estiloRoupa: "" });
    } catch (error: any) {
      console.error("Erro ao criar personagem:", error);
      setIsCreating(false);
      setError(error.message || "Erro ao criar personagem. Tente novamente.");
    }
  };

  // Geração do Prompt Master
  const generateFullPrompt = async () => {
    if (!selectedChar || scenes.every(s => !s.trim())) return;
    setIsGeneratingPrompt(true);

    const systemPrompt = `Você é o Engenheiro de Prompts Chefe. 
    Crie um prompt técnico em INGLÊS.
    
    DIRETRIZES:
    1. AMBIENTE: Transforme em um cenário cinematográfico.
    2. CONSISTÊNCIA: Mantenha traços físicos fixos.
    3. LINGUAGEM: Visual em INGLÊS, diálogos em PORTUGUÊS.
    4. CÂMERA: Use termos técnicos de cinema.
    
    Retorne JSON com o campo "prompt".`;

    const userPrompt = `
      CHARACTER DATA: ${JSON.stringify(selectedChar)}
      GLOBAL BACKGROUND: ${globalEnvironment || "Cinematic studio background"}
      SCRIPT/SCENES: ${scenes.join(" | ")}
      
      Create the ultimate high-fidelity prompt. English for visuals, Portuguese for dialogue.`;

    const schema = {
      type: "OBJECT",
      properties: {
        prompt: { type: "STRING" }
      }
    };

    try {
      const result = await callGemini(userPrompt, systemPrompt, schema);
      if (result && result.prompt) {
        setGeneratedPrompt(result.prompt);
      } else {
        throw new Error("A IA não retornou o prompt esperado.");
      }
      setIsGeneratingPrompt(false);
    } catch (error: any) {
      console.error("Erro ao gerar prompt final:", error);
      setIsGeneratingPrompt(false);
      setError(error.message || "Erro ao gerar prompt final. Tente novamente.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans p-4 md:p-8 selection:bg-blue-600/40">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar: Configurações de Elenco */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/80 p-6 rounded-[2rem] border border-zinc-800 shadow-2xl backdrop-blur-xl">
            <h2 className="text-xl font-black flex items-center gap-2 mb-6 text-blue-500 italic">
              <UserPlus className="w-5 h-5" />
              NOVO PERSONAGEM
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Informações Básicas</label>
                <input 
                  placeholder="Nome do Personagem" 
                  className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 focus:ring-2 focus:ring-blue-600 outline-none transition-all text-sm"
                  value={newChar.nome}
                  onChange={e => setNewChar({...newChar, nome: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  placeholder="Idade" 
                  className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                  value={newChar.idade}
                  onChange={e => setNewChar({...newChar, idade: e.target.value})}
                />
                <input 
                  placeholder="País" 
                  className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                  value={newChar.nacionalidade}
                  onChange={e => setNewChar({...newChar, nacionalidade: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest flex items-center gap-2">
                  <Shirt className="w-3 h-3 text-blue-500" /> Vestuário (Básico)
                </label>
                <textarea 
                  placeholder="Diga o básico (ex: terno azul) e a IA criará os detalhes luxuosos..." 
                  className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 focus:ring-2 focus:ring-blue-600 outline-none resize-none h-24 text-sm"
                  value={newChar.estiloRoupa}
                  onChange={e => setNewChar({...newChar, estiloRoupa: e.target.value})}
                />
              </div>
              <button 
                onClick={createCharacter}
                disabled={isCreating || !newChar.nome}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-20 shadow-[0_0_20px_rgba(37,99,235,0.3)] group"
              >
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:scale-125 transition-transform" />}
                {isCreating ? "IA ESTÁ CRIANDO..." : "EXPANDIR PERSONAGEM"}
              </button>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-[10px] text-red-400 font-bold animate-in fade-in slide-in-from-top-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/50">
            <h2 className="text-[10px] font-black mb-4 text-zinc-500 uppercase tracking-[0.2em]">Elenco Criado</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {characters.map(char => (
                <div 
                  key={char.id}
                  onClick={() => setSelectedChar(char)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center group ${selectedChar?.id === char.id ? 'border-blue-600 bg-blue-600/10 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black">
                      {(char.Identidade?.Nome || "U").charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-xs text-white uppercase tracking-wider">{char.Identidade?.Nome}</p>
                      <p className="text-[9px] text-zinc-500">{char.Identidade?.Nacionalidade}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCharacters(characters.filter(c => c.id !== char.id)); if(selectedChar?.id === char.id) setSelectedChar(null); }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {characters.length === 0 && <p className="text-zinc-700 text-xs italic text-center py-4">Sem personagens.</p>}
            </div>
          </div>
        </div>

        {/* Painel Principal */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-zinc-800 shadow-2xl backdrop-blur-xl flex flex-col min-h-[850px]">
            
            <header className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] rotate-3">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white italic tracking-tighter leading-none">KRIPTUM PRO</h1>
                  <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">PROMPT ENGINE v4.0</p>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-8">
              
              {/* Ambiente Global */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Ambiente (Básico)</h2>
                </div>
                <textarea 
                  placeholder="Diga apenas o lugar (ex: praia, cassino, restaurante) e a IA cuidará de toda a iluminação e arquitetura cinematográfica."
                  className="w-full h-24 bg-zinc-950 p-5 rounded-3xl border border-zinc-800 focus:ring-2 focus:ring-blue-600 outline-none resize-none transition-all text-sm text-zinc-200 placeholder:text-zinc-700 shadow-inner"
                  value={globalEnvironment}
                  onChange={e => setGlobalEnvironment(e.target.value)}
                />
              </div>

              {/* Roteiro de Cenas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-blue-500" />
                    <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Ações & Falas</h2>
                  </div>
                  <button 
                    onClick={() => setScenes([...scenes, ""])}
                    className="text-[9px] font-black bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Plus className="w-3 h-3" /> NOVA CENA
                  </button>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {scenes.map((scene, idx) => (
                    <div key={idx} className="relative group animate-in">
                      <div className="absolute -left-3 top-5 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-xl z-10">
                        {idx + 1}
                      </div>
                      <textarea 
                        placeholder={`Descreva a ação e o diálogo (ex: Ela caminha até a mesa e diz: 'Olá'). A IA expandirá para termos técnicos.`}
                        className="w-full h-24 bg-zinc-950 p-6 pl-10 rounded-[2rem] border border-zinc-800 focus:ring-2 focus:ring-blue-600 outline-none resize-none transition-all text-sm text-zinc-300"
                        value={scene}
                        onChange={e => {
                          const newScenes = [...scenes];
                          newScenes[idx] = e.target.value;
                          setScenes(newScenes);
                        }}
                      />
                      {scenes.length > 1 && (
                        <button 
                          onClick={() => setScenes(scenes.filter((_, i) => i !== idx))}
                          className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={generateFullPrompt}
                disabled={!selectedChar || isGeneratingPrompt || scenes.every(s => !s.trim())}
                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all disabled:opacity-20 shadow-[0_15px_50px_rgba(37,99,235,0.4)] active:scale-[0.98] uppercase tracking-widest border-t border-white/10"
              >
                {isGeneratingPrompt ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sparkles className="w-7 h-7" />}
                {isGeneratingPrompt ? "EXPANDINDO PROMPT..." : "GERAR PROMPT FINAL KRIPTUM"}
              </button>

              {/* Resultado Final */}
              {generatedPrompt && (
                <div className="space-y-4 animate-in pt-4">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Prompt Mestre Pronto</h3>
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-2 text-white bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-2xl border border-zinc-700 transition-all text-xs font-bold shadow-xl"
                    >
                      {copyStatus ? <CheckCircle2 className="w-4 h-4 text-blue-400" /> : <Copy className="w-4 h-4" />}
                      {copyStatus ? "COPIADO" : "COPIAR"}
                    </button>
                  </div>
                  <div className="bg-black text-blue-100/70 p-8 rounded-[2.5rem] font-mono text-xs leading-relaxed border border-zinc-800 shadow-inner max-h-[250px] overflow-y-auto custom-scrollbar selection:bg-blue-600/50">
                    {generatedPrompt}
                  </div>
                </div>
              )}
            </div>

            <footer className="mt-12 pt-8 border-t border-zinc-800/50 flex items-center justify-between text-[9px] text-zinc-600 font-black uppercase tracking-[0.3em]">
              <div className="flex gap-8">
                <span className="flex items-center gap-1"><Settings className="w-3 h-3"/> Auto-Expansion active</span>
                <span>Consistency Lock: ON</span>
              </div>
              <span className="text-blue-900/60">KRIPTUM OPTIMIZED SYSTEM</span>
            </footer>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
        @keyframes fadeIn { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export { PromptGenerator };
