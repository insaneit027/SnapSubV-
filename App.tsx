import React, { useState, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer';
import SubtitleEditor from './components/SubtitleEditor';
import { Subtitle, VideoState, SubtitleStyle, ExportResolution } from './types';
import { generateSubtitles } from './services/geminiService';
import { formatTime, offsetTime } from './utils/time';
import { exportVideo } from './utils/videoExporter';
import { translations, Language } from './utils/translations';
import { Video, Layout, Trash2, Download, ChevronDown, Loader2, X, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [videoState, setVideoState] = useState<VideoState>({
    file: null,
    url: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
  });

  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seekRequest, setSeekRequest] = useState<number | null>(null);
  
  // Language State
  const [lang, setLang] = useState<Language>('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = translations[lang];
  
  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Subtitle Styling State
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    fontFamily: 'Anton',
    textColor: '#FFFFFF',
    highlightColor: '#FACC15', // Yellow Viral Default
    fontSize: 36,
    isBold: true,
    animation: 'pop',
    verticalPosition: 15, // Default 15% from bottom
  });

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clean up old URL
    if (videoState.url) {
      URL.revokeObjectURL(videoState.url);
    }

    const url = URL.createObjectURL(file);
    setVideoState({
      file,
      url,
      duration: 0, // Will be set by onLoadedMetadata
      currentTime: 0,
      isPlaying: false,
    });
    
    // Reset subtitles on new file
    setSubtitles([]);
  };

  const handleRemoveVideo = () => {
    if (videoState.url) {
      URL.revokeObjectURL(videoState.url);
    }
    
    setVideoState({
      file: null,
      url: null,
      duration: 0,
      currentTime: 0,
      isPlaying: false,
    });
    setSubtitles([]);
  };

  const handleGenerate = async () => {
    if (!videoState.file) return;
    
    setIsGenerating(true);
    try {
      const generated = await generateSubtitles(videoState.file);
      setSubtitles(generated);
    } catch (error) {
      console.error("Failed to generate subtitles", error);
      alert("Failed to generate subtitles. Please check your API key and file size (recommended < 20MB).");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSubtitle = (id: string, updates: Partial<Subtitle>) => {
    setSubtitles(prev => prev.map(sub => sub.id === id ? { ...sub, ...updates } : sub));
  };

  const deleteSubtitle = (id: string) => {
    setSubtitles(prev => prev.filter(sub => sub.id !== id));
  };

  const addSubtitle = () => {
    const newSub: Subtitle = {
      id: crypto.randomUUID(),
      startTime: formatTime(videoState.currentTime),
      endTime: formatTime(videoState.currentTime + 3),
      text: "New Subtitle"
    };
    // Insert in time order
    const newSubs = [...subtitles, newSub].sort((a, b) => a.startTime.localeCompare(b.startTime));
    setSubtitles(newSubs);
  };

  const handleExportText = () => {
    let content = "WEBVTT\n\n";
    subtitles.forEach(sub => {
      content += `${sub.startTime} --> ${sub.endTime}\n${sub.text}\n\n`;
    });

    const blob = new Blob([content], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "subtitles.vtt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVideoExport = async (resolution: ExportResolution) => {
    if (!videoState.file) return;
    setShowExportMenu(false);
    setIsExporting(true);
    setExportProgress(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const blob = await exportVideo(
        videoState.file,
        subtitles,
        subtitleStyle,
        resolution,
        (progress) => setExportProgress(Math.round(progress)),
        controller.signal
      );

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapsub_export_${resolution}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Export cancelled by user");
      } else {
        console.error("Export failed", error);
        alert("Failed to export video. Please try again.");
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-black text-white overflow-hidden">
      
      {/* Navigation Bar */}
      <nav className="h-14 border-b border-white/10 flex items-center px-4 justify-between bg-black z-20 relative">
        <div className="flex items-center gap-2 text-brand-500">
          <Video className="w-6 h-6" />
          <span className="font-bold text-lg tracking-tight text-white">{t.nav.brand}</span>
        </div>
        <div className="flex items-center gap-4">
             {/* Language Switcher - Located Left of Remove Video (when visible) */}
             <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-900 rounded text-xs font-medium text-gray-400 hover:text-white transition-colors"
                >
                  <Globe size={14} />
                  <span>{lang.toUpperCase()}</span>
                </button>
                
                {showLangMenu && (
                  <div className="absolute top-full right-0 mt-2 w-24 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50">
                    {(['en', 'pt', 'es'] as Language[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setShowLangMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 rounded flex items-center justify-between ${lang === l ? 'text-brand-400 font-bold' : 'text-gray-300'}`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
             </div>

             {videoState.url && (
                 <div className="flex items-center gap-2">
                   <button 
                      type="button"
                      onClick={handleRemoveVideo}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-red-900/20 text-gray-400 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 rounded-md transition-all text-xs font-medium cursor-pointer z-50"
                   >
                      <Trash2 size={14} />
                      <span>{t.nav.remove}</span>
                   </button>

                   {/* Export Video Dropdown */}
                   <div className="relative">
                      <button 
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-md transition-all text-xs font-bold shadow-lg shadow-brand-500/20"
                      >
                        <Download size={14} />
                        <span>{t.nav.export}</span>
                        <ChevronDown size={12} />
                      </button>

                      {showExportMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                          <div className="p-1">
                            <button 
                              onClick={() => handleVideoExport('720p')}
                              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800 rounded hover:text-white flex items-center justify-between"
                            >
                              <span>MP4 720p</span>
                              <span className="text-[10px] bg-zinc-800 text-gray-500 px-1 rounded border border-zinc-700">HD</span>
                            </button>
                            <button 
                              onClick={() => handleVideoExport('1080p')}
                              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800 rounded hover:text-white flex items-center justify-between"
                            >
                              <span>MP4 1080p</span>
                              <span className="text-[10px] bg-brand-900 text-brand-400 px-1 rounded border border-brand-800">FHD</span>
                            </button>
                          </div>
                        </div>
                      )}
                   </div>
                 </div>
             )}
             <a href="#" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                <Layout size={14} /> {t.nav.version}
             </a>
        </div>
      </nav>

      {/* Exporting Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
           <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in duration-300">
              <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{t.export.title}</h3>
              <p className="text-sm text-gray-400 text-center mb-6">{t.export.desc}</p>
              
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-6">
                 <div 
                    className="h-full bg-brand-500 transition-all duration-300 ease-out"
                    style={{ width: `${exportProgress}%` }}
                 />
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-mono text-brand-400">{exportProgress}% {t.export.progress}</span>
                
                <button 
                  onClick={handleCancelExport}
                  className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <X size={12} /> {t.export.cancel}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Video Section */}
        <main className="flex-1 flex flex-col p-4 md:p-6 relative bg-black">
          <div className="flex-1 flex items-center justify-center relative min-h-0">
             <VideoPlayer 
               videoState={videoState}
               subtitles={subtitles}
               subtitleStyle={subtitleStyle}
               onTimeUpdate={(t) => setVideoState(prev => ({ ...prev, currentTime: t }))}
               onDurationChange={(d) => setVideoState(prev => ({ ...prev, duration: d }))}
               onPlayPause={(p) => setVideoState(prev => ({ ...prev, isPlaying: p }))}
               onFileUpload={handleFileUpload}
               seekTo={seekRequest}
               t={t}
             />
          </div>
          
          {/* Bottom Metadata */}
          {videoState.url && (
              <div className="h-12 mt-4 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center px-4 justify-between text-xs font-mono text-gray-400">
                  <div>
                      <span>{formatTime(videoState.currentTime)}</span>
                      <span className="mx-2 text-gray-600">/</span>
                      <span>{formatTime(videoState.duration)}</span>
                  </div>
                  <div>
                      {subtitles.length} {t.editor.title}
                  </div>
              </div>
          )}
        </main>

        {/* Sidebar Editor */}
        <SubtitleEditor 
          subtitles={subtitles}
          currentTime={videoState.currentTime}
          isGenerating={isGenerating}
          hasVideo={!!videoState.file}
          subtitleStyle={subtitleStyle}
          onUpdateSubtitle={updateSubtitle}
          onDeleteSubtitle={deleteSubtitle}
          onAddSubtitle={addSubtitle}
          onGenerate={handleGenerate}
          onUpdateStyle={setSubtitleStyle}
          onSeek={(time) => {
            setSeekRequest(time);
            setTimeout(() => setSeekRequest(null), 100);
          }}
          onExport={handleExportText}
          t={t}
        />

      </div>
    </div>
  );
};

export default App;