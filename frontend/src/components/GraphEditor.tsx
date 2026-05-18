// frontend/src/components/GraphEditor.tsx
'use client';

import { toPng } from 'html-to-image';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  Code, Copy,
  Download,
  GitBranch,
  Globe,
  Layers,
  MessageSquare,
  Mic,
  Network,
  PanelRightClose, PanelRightOpen,
  Paperclip,
  PlayCircle,
  RefreshCw,
  Send,
  Share2, Terminal,
  Zap,
  Sun,
  Moon,
  Undo,
  Redo
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  applyEdgeChanges, applyNodeChanges,
  Background, BackgroundVariant, Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from '../components/CustomNode';
import { getLayoutedElements } from '../utils/layout';
import HolographicScene from './HolographicScene';
import LoadingCore from './LoadingCore';
import { useTheme } from '../context/ThemeContext';

interface EditorProps { onBack: () => void; }

// --- Graph data shape returned by the backend ---
interface GraphData {
  title: string;
  summary: string;
  explanation: string;
  execution_trace: string;
  example_input?: string;
  code_snippet: string;
  code_explanation?: string;
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string; label: string }[];
}

interface codeObject {
  code_snippet: string;
  code_explanation: string;
}

// --- SpeechRecognition type shim (not in lib.dom.d.ts) ---
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface WebkitSpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  start(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition: new () => WebkitSpeechRecognition;
}

// --- 🔧 CONFIGURATION: SINGLE SOURCE OF TRUTH ---
// This ensures we ALWAYS talk to Render, avoiding localhost confusion.
const BACKEND_URL = "https://visualaize-backend.onrender.com"; 

// --- FIXED CSS FOR GLASS BUTTONS ---
const glassControlsStyle = `
  .react-flow__panel .react-flow__controls {
    background: rgba(15, 23, 42, 0.6) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
    overflow: hidden !important;
  }
  .react-flow__controls-button {
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    width: 30px !important;
    height: 30px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: background 0.2s ease !important;
  }
  .react-flow__controls-button:last-child {
    border-bottom: none !important;
  }
  .react-flow__controls-button:hover {
    background: rgba(255, 255, 255, 0.2) !important;
  }
  .react-flow__controls-button svg {
    fill: rgba(255, 255, 255, 0.8) !important;
    max-width: 14px !important;
    max-height: 14px !important;
  }
  .react-flow__controls-button:hover svg {
    fill: #3b82f6 !important;
  }
`;

const SystemLogs = () => {
  const [logs, setLogs] = useState<string[]>(["> INITIALIZING VISUALAIZE CORE..."]);
  
  useEffect(() => {
    const messages = [
      "LOADING NEURAL MODULES...",
      "CONNECTING TO SATELLITE...",
      "FETCHING GLOBAL CONTEXT...",
      "OPTIMIZING RENDERING ENGINE...",
      "SYSTEM READY.",
      "AWAITING INPUT..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < messages.length) {
        setLogs(prev => [...prev.slice(-4), `> ${messages[i]}`]);
        i++;
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-6 left-6 z-0 pointer-events-none font-mono text-[10px] text-emerald-500/60 leading-relaxed tracking-wider">
      {logs.map((log, i) => (
        <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
           {log}<span className="animate-pulse">_</span>
        </div>
      ))}
    </div>
  );
};

const ZeroState = ({ onSelect }: { onSelect: (text: string) => void }) => {
  const suggestions = [
    { icon: GitBranch, label: "Binary DFA", desc: "Automaton Logic", prompt: "DFA that accepts binary strings ending in 101" },
    { icon: Network, label: "Neural Network", desc: "Architecture", prompt: "Diagram of a Transformer neural network architecture" },
    { icon: Box, label: "System Flow", desc: "Process Map", prompt: "Flowchart for a secure user authentication system" },
    { icon: Share2, label: "Mind Map", desc: "Knowledge Graph", prompt: "Mind map of the history of Space Exploration" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <div className="text-center p-8 max-w-5xl w-full animate-in fade-in zoom-in duration-500">
        <div className="mb-12 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -z-10" />
             <h2 className="text-6xl font-black text-white mb-2 tracking-tighter drop-shadow-2xl">
                VISUAL<span className="text-blue-500">AI</span>ZE
             </h2>
             <p className="text-blue-200/60 font-mono text-sm tracking-[0.3em]">SYSTEM READY // AWAITING INPUT</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pointer-events-auto">
          {suggestions.map((item, i) => (
            <button key={i} onClick={() => onSelect(item.prompt)} className="group relative p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md hover:bg-blue-900/20 hover:border-blue-500/50 transition-all text-left hover:-translate-y-2 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 mb-4 p-3 w-fit rounded-lg bg-white/5 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <item.icon size={24} />
              </div>
              <h3 className="relative z-10 text-lg font-bold text-white mb-1">{item.label}</h3>
              <p className="relative z-10 text-xs text-slate-400 uppercase tracking-wider group-hover:text-blue-300">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function EditorContent({ onBack }: EditorProps) {
  const { theme, toggleTheme } = useTheme();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'CODE' | 'CHAT'>('ANALYSIS');
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('Python');
  const [showLanguageDropDown, setshowLanguageDropDown] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const codeCache = useRef(new Map<string, codeObject>());
  const reactFlowWrapper = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const { getNodes } = useReactFlow(); 

  // --- UNDO / REDO / HISTORY SAVE ---
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const indexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoStates = () => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current < historyRef.current.length - 1);
  };

  // --- COPY TO CLIPBOARD SYSTEM ---
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLogic, setCopiedLogic] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const copyToClipboard = useCallback(async (text: string, setCopiedState: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, []);

  const pushToHistory = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    const history = historyRef.current.slice(0, indexRef.current + 1);
    
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (
        JSON.stringify(last.nodes) === JSON.stringify(currentNodes) &&
        JSON.stringify(last.edges) === JSON.stringify(currentEdges)
      ) {
        return;
      }
    }

    historyRef.current = [...history, { nodes: JSON.parse(JSON.stringify(currentNodes)), edges: JSON.parse(JSON.stringify(currentEdges)) }];
    indexRef.current = historyRef.current.length - 1;
    updateUndoRedoStates();
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current -= 1;
      const { nodes: prevNodes, edges: prevEdges } = historyRef.current[indexRef.current];
      setNodes(JSON.parse(JSON.stringify(prevNodes)));
      setEdges(JSON.parse(JSON.stringify(prevEdges)));
      localStorage.setItem('saved_nodes', JSON.stringify(prevNodes));
      localStorage.setItem('saved_edges', JSON.stringify(prevEdges));
      updateUndoRedoStates();
    }
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current += 1;
      const { nodes: nextNodes, edges: nextEdges } = historyRef.current[indexRef.current];
      setNodes(JSON.parse(JSON.stringify(nextNodes)));
      setEdges(JSON.parse(JSON.stringify(nextEdges)));
      localStorage.setItem('saved_nodes', JSON.stringify(nextNodes));
      localStorage.setItem('saved_edges', JSON.stringify(nextEdges));
      updateUndoRedoStates();
    }
  }, []);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        redo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Load Saved Workspace on Mount
  useEffect(() => {
    const savedGraphData = localStorage.getItem('saved_graph_data');
    const savedNodes = localStorage.getItem('saved_nodes');
    const savedEdges = localStorage.getItem('saved_edges');
    const savedPrompt = localStorage.getItem('saved_prompt');
    
    if (savedGraphData && savedNodes && savedEdges) {
      try {
        const parsedGraphData = JSON.parse(savedGraphData);
        const parsedNodes = JSON.parse(savedNodes);
        const parsedEdges = JSON.parse(savedEdges);
        
        setGraphData(parsedGraphData);
        setNodes(parsedNodes);
        setEdges(parsedEdges);
        if (savedPrompt) setPrompt(savedPrompt);
        
        // Setup initial history entry
        historyRef.current = [{ nodes: parsedNodes, edges: parsedEdges }];
        indexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
        setIsSidebarOpen(true);
      } catch (e) {
        console.error("Failed to load saved graph:", e);
      }
    }
  }, []);

  // Callbacks for ReactFlow drag & delete changes
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node, nds: Node[]) => {
    pushToHistory(nds, edges);
    localStorage.setItem('saved_nodes', JSON.stringify(nds));
  }, [edges, pushToHistory]);

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    setTimeout(() => {
      const currentNodes = getNodes();
      pushToHistory(currentNodes, edges);
      localStorage.setItem('saved_nodes', JSON.stringify(currentNodes));
    }, 0);
  }, [edges, getNodes, pushToHistory]);

  const nodeTypes = useMemo(() => ({ default: CustomNode, input: CustomNode, output: CustomNode }), []);
  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const generateGraph = async (text: string) => {
    if (!text) return;
    setLoading(true);
    setPrompt(text);
    setGraphData(null);
    setActiveTab('ANALYSIS'); 
    setCodeLanguage('Python');
    setChatHistory([]);
    setIsSidebarOpen(false);
    setshowLanguageDropDown(false);

    console.log("🚀 [FRONTEND] Connecting to Backend at:", BACKEND_URL);

    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ prompt: text }),
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ [BACKEND ERROR]:", res.status, errText);
        throw new Error(`Server Error (${res.status}): ${errText}`);
      }
      
      const data = await res.json();
      console.log("✅ [SUCCESS] Data received:", data);
      
      setGraphData(data);
      codeCache.current.clear();
      codeCache.current.set(codeLanguage, {code_snippet: data.code_snippet ?? '', code_explanation: data.code_explanation ?? ''});
      
      const rawNodes: Node[] = data.nodes.map((n: { id: string; label: string }) => ({
        id: n.id, type: 'default', data: { label: n.label }, position: { x: 0, y: 0 },
        style: { background: 'transparent', border: 'none', boxShadow: 'none', width: 'auto' },
      }));
      const rawEdges: Edge[] = data.edges.map((e: { source: string; target: string; label: string }, i: number) => ({
        id: `e-${i}`, source: e.source, target: e.target, label: e.label, type: 'bezier', animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
        style: { stroke: '#3b82f6', strokeWidth: 2, filter: 'drop-shadow(0 0 3px #3b82f6)' },
        labelStyle: { fill: '#93c5fd', fontWeight: 700 }
      }));
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      pushToHistory(layoutedNodes, layoutedEdges);
      
      localStorage.setItem('saved_graph_data', JSON.stringify(data));
      localStorage.setItem('saved_nodes', JSON.stringify(layoutedNodes));
      localStorage.setItem('saved_edges', JSON.stringify(layoutedEdges));
      localStorage.setItem('saved_prompt', text);
      
      setIsSidebarOpen(true); 

    } catch (err: any) {
      console.error("🚨 [CRITICAL ERROR]:", err);
      let errMsg = err.message || '';
      
      try {
        if (errMsg.includes("Server Error")) {
          const jsonStart = errMsg.indexOf('{');
          if (jsonStart !== -1) {
            const errObj = JSON.parse(errMsg.substring(jsonStart));
            if (errObj.detail) {
              errMsg = errObj.detail;
            }
          }
        }
      } catch (e) {}

      if (errMsg.includes("GEMINI_API_KEY") || errMsg.includes("Gemini") || errMsg.includes("API key") || errMsg.includes("AI Studio")) {
        alert(`🔑 API KEY CONFIGURATION\n\n${errMsg}`);
      } else {
        alert(`System Busy. Please check the console for the exact error.\n\nDetails: ${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const regenerateCode = async (newLang: string) => {
    setCodeLanguage(newLang);
    setIsRegeneratingCode(true);
    try {
      const res = await fetch(`${BACKEND_URL}/regenerate_code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, language: newLang }),
      });
      const data = await res.json();
      setGraphData((prev: GraphData | null) => prev ? ({ ...prev, code_snippet: data.code_snippet, code_explanation: data.code_explanation }) : prev);
      if (data) codeCache.current.set(newLang, {code_snippet: data.code_snippet ?? '', code_explanation: data.code_explanation ?? ''})
    } catch (err) { alert("Failed to rewrite code."); } finally { setIsRegeneratingCode(false); }
  } 

  const handleLanguageChange = async (newLang: string) => {
    setshowLanguageDropDown(false);
    if (newLang === codeLanguage || !graphData) return;
    if (codeCache.current.has(newLang)){
      setCodeLanguage(newLang);
      const cachedCodeData = codeCache.current.get(newLang);
      setGraphData((prev: GraphData | null) => prev && cachedCodeData ? ({ ...prev, code_snippet: cachedCodeData.code_snippet, code_explanation: cachedCodeData.code_explanation }) : prev);
      return; 
    }
    regenerateCode(newLang);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !graphData) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);
    try {
        const res = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg, context: `Title: ${graphData.title}. Explanation: ${graphData.explanation}` }),
        });
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
        setChatHistory(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting right now." }]);
    } finally { setIsChatting(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if(text) { setPrompt(text.substring(0, 100)); generateGraph(text); }
    };
    reader.readAsText(file);
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as WindowWithSpeech).webkitSpeechRecognition();
      recognition.continuous = false; recognition.lang = 'en-US'; setIsListening(true);
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript); generateGraph(transcript); setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false); recognition.onend = () => setIsListening(false); recognition.start();
    } else { alert("Voice control requires Chrome/Edge."); }
  };

  const handleExport = () => {
    if (reactFlowWrapper.current === null) return;
    toPng(reactFlowWrapper.current, { backgroundColor: '#020617' }).then((dataUrl) => {
        const link = document.createElement('a'); link.download = 'visualaize-graph.png'; link.href = dataUrl; link.click();
    });
  };

  const handleCopyCode = () => {
    if (graphData?.code_snippet) {
      navigator.clipboard.writeText(graphData.code_snippet); setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  const showBackground = nodes.length === 0;

  return (
    <div className="relative flex h-screen w-screen bg-slate-50 dark:bg-black overflow-hidden font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* 0. INJECT CSS FOR CONTROLS */}
      <style>{glassControlsStyle}</style>

      {/* 1. THE 3D HOLOGRAPHIC BACKGROUND */}
      <div className={`absolute inset-0 transition-opacity duration-1000 z-0 ${showBackground ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <HolographicScene />
      </div>

      <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-950/20 pointer-events-none z-0" />
      {loading && <LoadingCore />}

      {/* 4. MAIN UI LAYER */}
      <div className="relative flex-1 h-full flex flex-col z-10" ref={reactFlowWrapper}>
        
        {/* TOP BAR */}
        <div className="absolute top-0 left-0 w-full p-6 z-40 flex justify-between items-center pointer-events-none">
          <div className="flex gap-3 pointer-events-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors px-4 py-2 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/20 cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> <span className="font-mono text-xs tracking-widest">TERMINAL</span>
            </button>
            
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} className="text-indigo-600" />}
            </button>
          </div>
          
          <div className="flex gap-4 pointer-events-auto items-center">
             {nodes.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={undo} 
                  disabled={!canUndo} 
                  className={`p-1.5 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/5 transition-all cursor-pointer ${!canUndo ? 'opacity-30 cursor-not-allowed text-slate-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 shadow-sm'}`}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo size={14} />
                </button>
                <button 
                  onClick={redo} 
                  disabled={!canRedo} 
                  className={`p-1.5 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/5 transition-all cursor-pointer ${!canRedo ? 'opacity-30 cursor-not-allowed text-slate-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 shadow-sm'}`}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo size={14} />
                </button>
              </div>
             )}

             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/10 text-xs font-mono text-emerald-600 dark:text-emerald-400 shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> ONLINE
             </div>
             
             {graphData && (
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-white transition-all shadow-lg cursor-pointer"
                 >
                    {isSidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                    {isSidebarOpen ? 'CLOSE PANEL' : 'OPEN PANEL'}
                 </button>
             )}
          </div>
        </div>

        {nodes.length === 0 && !loading && <ZeroState onSelect={generateGraph} />}
        {nodes.length === 0 && !loading && <SystemLogs />}

        {/* MAIN GRAPH AREA */}
        <div className="flex-1 w-full h-full">
            <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                nodeTypes={nodeTypes} 
                onNodesChange={onNodesChange} 
                onEdgesChange={onEdgesChange} 
                onNodeDragStop={onNodeDragStop}
                onNodesDelete={onNodesDelete}
                fitView 
                minZoom={0.1}
            >
                <Background color="#94a3b8" gap={40} size={1} variant={BackgroundVariant.Dots} className="opacity-[0.1]" />
                <Controls /> 
                <MiniMap className="!bg-white/80 dark:!bg-slate-900/80 !backdrop-blur-md !border-slate-200 dark:!border-slate-800 rounded-lg" nodeColor="#3b82f6" maskColor="rgba(15, 23, 42, 0.6)" />
            </ReactFlow>
        </div>

        {/* INPUT BAR */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] z-50">
            <form onSubmit={(e) => { e.preventDefault(); generateGraph(prompt); }} className="relative group flex items-center gap-3 p-2 pl-4 rounded-full border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-black/60 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                <Terminal size={18} className="text-blue-600 dark:text-blue-400" />
                <input type="text" placeholder="Describe a system..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="flex-1 bg-transparent text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium outline-none font-mono"/>
                
                <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.json,.js,.py" onChange={handleFileUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer" title="Upload Problem File">
                    <Paperclip size={18} />
                </button>

                <button type="button" onClick={startListening} className={`p-2 rounded-full transition-all cursor-pointer ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                    <Mic size={18} />
                </button>

                <button type="submit" disabled={loading} className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-widest transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
                    {loading ? <span className="animate-pulse">PROCESSING</span> : "GENERATE"}
                </button>
            </form>
        </div>
      </div>

      {/* RIGHT: SLIDING SIDEBAR */}
      <div 
        className={`border-l border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/60 backdrop-blur-2xl flex flex-col shadow-2xl z-40 transition-all duration-500 ease-in-out overflow-hidden`}
        style={{ width: isSidebarOpen && graphData ? '450px' : '0px', opacity: isSidebarOpen && graphData ? 1 : 0 }}
      >
        {graphData && (
            <>
            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-start min-w-[450px]">
                <div>
                   <div className="flex items-center gap-2 mb-2 text-xs font-bold tracking-widest text-blue-600 dark:text-blue-500 uppercase"><Layers size={12} /> Analysis Complete</div>
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{graphData.title}</h2>
                </div>
                <div className="flex gap-2">
                     <button 
                         onClick={() => copyToClipboard(JSON.stringify(graphData, null, 2), setCopiedJson)} 
                         className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer" 
                         title="Copy Raw Graph JSON"
                     >
                         {copiedJson ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                     </button>
                     <button onClick={handleExport} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Export Image">
                         <Download size={18} />
                     </button>
                </div>
            </div>

            <div className="flex border-b border-slate-200 dark:border-white/10 min-w-[450px]">
                <button onClick={() => setActiveTab('ANALYSIS')} className={`flex-1 py-3 text-xs font-bold tracking-wider hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${activeTab === 'ANALYSIS' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>ANALYSIS</button>
                <button onClick={() => setActiveTab('CODE')} className={`flex-1 py-3 text-xs font-bold tracking-wider hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'CODE' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}><Code size={14} /> CODE</button>
                <button onClick={() => setActiveTab('CHAT')} className={`flex-1 py-3 text-xs font-bold tracking-wider hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'CHAT' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400' : 'text-slate-400 dark:text-slate-500'}`}><MessageSquare size={14} /> AI TUTOR</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-[450px]">
                {activeTab === 'ANALYSIS' && (
                  <>
                    <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white"><Activity size={16} className="text-emerald-500 dark:text-emerald-400" /> Executive Summary</div>
                            <button 
                                onClick={() => copyToClipboard(graphData.summary, setCopiedSummary)} 
                                className="px-2 py-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                title="Copy Summary"
                            >
                                {copiedSummary ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                {copiedSummary ? 'COPIED' : 'COPY'}
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{graphData.summary}</p>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-white/5 pb-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white"><BookOpen size={16} className="text-purple-500 dark:text-purple-400" /> System Logic</div>
                            <button 
                                onClick={() => copyToClipboard(graphData.explanation, setCopiedLogic)} 
                                className="px-2 py-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                title="Copy Logic"
                            >
                                {copiedLogic ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                {copiedLogic ? 'COPIED' : 'COPY'}
                            </button>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-4">{graphData.explanation}</div>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-black/40">
                        <div className="px-4 py-2 bg-slate-200/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 flex justify-between items-center">
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">EXECUTION TRACE</span>
                            <PlayCircle size={14} className="text-emerald-600 dark:text-emerald-500" />
                        </div>
                        <div className="p-4 font-mono text-xs space-y-3">
                            <div className="flex gap-4"><span className="text-slate-400 dark:text-slate-600">INPUT</span><span className="text-emerald-600 dark:text-emerald-400 tracking-widest">{graphData.example_input}</span></div>
                            <div className="h-px bg-slate-200 dark:bg-white/10 w-full" />
                            <p className="text-slate-600 dark:text-slate-400 leading-6">{graphData.execution_trace}</p>
                        </div>
                    </div>
                  </>
                )}

                {activeTab === 'CODE' && (
                  <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <div className="relative flex gap-2">
                        <div className="">
                        <button className={`flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer ${isRegeneratingCode? 'opacity-50':'opacity-100'}`}
                          onClick={() => setshowLanguageDropDown(p => !p)}
                          disabled={isRegeneratingCode}
                        >
                          {codeLanguage} 
                          <ChevronDown size={12} className={`transition-transform ${showLanguageDropDown ? 'rotate-180' : ''}`} />
                          </button>
                        {showLanguageDropDown && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setshowLanguageDropDown(false)} 
                            />
                            
                            <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                              {['Python', 'JavaScript', 'C++', 'Java'].map(lang => (
                                <button 
                                  key={lang} 
                                  onClick={() => handleLanguageChange(lang)} 
                                  className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-colors first:border-b-0 cursor-pointer"
                                >
                                      {lang}
                                  </button>
                              ))}
                          </div>
                          </>
                        )}
                      </div>
                            <button
                              className={`flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:border-blue-500/50 transition-colors cursor-pointer ${isRegeneratingCode? 'opacity-50': 'opacity-100'}`}
                              disabled={isRegeneratingCode}
                              onClick={() => regenerateCode(codeLanguage)}
                              aria-label="Regenerate code"
                              title="Regenerate code"
                            >
                              <RefreshCw size={14}/>
                            </button>
                      </div>
                      <button onClick={handleCopyCode} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors cursor-pointer">
                        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                    <div className="flex-1 rounded-xl bg-slate-100/80 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 overflow-x-auto relative">
                        {isRegeneratingCode && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-blue-400 text-xs font-bold animate-pulse z-10">REWRITING...</div>}
                      <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{graphData.code_snippet}</pre>
                    </div>
                  </div>
                )}

                {activeTab === 'CHAT' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {chatHistory.length === 0 && (
                                <div className="text-center text-slate-400 dark:text-slate-500 mt-10 text-sm">
                                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Ask me anything about this graph!</p>
                                </div>
                            )}
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-bl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isChatting && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl rounded-bl-none border border-slate-250 dark:border-white/10">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
                                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-100" />
                                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-200" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleChatSubmit} className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 relative">
                            <input 
                                type="text" 
                                placeholder="Type your question..." 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-350 dark:border-white/10 rounded-lg pl-4 pr-10 py-3 text-xs text-slate-800 dark:text-white focus:border-blue-500 outline-none"
                            />
                            <button type="submit" disabled={isChatting} className="absolute right-2 top-6 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-white transition-colors cursor-pointer">
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
            
            <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 min-w-[450px]">
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-4 tracking-wider">Pro Capabilities</div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors group cursor-pointer"><div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-blue-500/20"><Zap size={14} className="group-hover:text-blue-600 dark:group-hover:text-blue-400" /></div><span className="text-xs font-medium">Real-time</span></div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors group cursor-pointer"><div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-emerald-500/20"><Globe size={14} className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400" /></div><span className="text-xs font-medium">Multi-Region</span></div>
                </div>
            </div>
            </>
        )}
      </div>
    </div>
  );
}

export default function GraphEditor(props: EditorProps) {
    return (
        <ReactFlowProvider>
            <EditorContent {...props} />
        </ReactFlowProvider>
    );
}