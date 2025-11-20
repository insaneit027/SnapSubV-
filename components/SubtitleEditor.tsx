import React, { useRef, useEffect, useState } from 'react';
import { Subtitle, SubtitleStyle, AnimationType } from '../types';
import { Trash2, Plus, Clock, Sparkles, Download, Type, Bold, Zap, Palette, MoveUp, ArrowUpFromLine, Globe, Star } from 'lucide-react';
import { isTimeInRange, parseTime } from '../utils/time';
import { Language } from '../utils/translations';

interface SubtitleEditorProps {
  subtitles: Subtitle[];
  currentTime: number;
  isGenerating: boolean;
  hasVideo: boolean;
  subtitleStyle: SubtitleStyle;
  onUpdateSubtitle: (id: string, updates: Partial<Subtitle>) => void;
  onDeleteSubtitle: (id: string) => void;
  onAddSubtitle: () => void;
  onGenerate: () => void;
  onUpdateStyle: (style: SubtitleStyle) => void;
  onSeek: (time: number) => void;
  onExport: () => void;
  t?: any;
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
}

const PRESET_STYLES = [
  {
    name: "Viral",
    style: {
      fontFamily: 'Anton',
      textColor: '#FFFFFF',
      highlightColor: '#FACC15', // Yellow
      fontSize: 42,
      isBold: true,
      animation: 'pop' as AnimationType
    },
    previewBg: "bg-gradient-to-br from-yellow-500/20 to-orange-500/20",
    previewText: "text-yellow-400 font-anton"
  },
  {
    name: "Clean",
    style: {
      fontFamily: 'Inter',
      textColor: '#FFFFFF',
      highlightColor: '#38bdf8', // Sky Blue
      fontSize: 32,
      isBold: false,
      animation: 'fade' as AnimationType
    },
    previewBg: "bg-zinc-800",
    previewText: "text-sky-400 font-sans"
  },
  {
    name: "Gaming",
    style: {
      fontFamily: 'Bangers',
      textColor: '#4ade80', // Green
      highlightColor: '#d946ef', // Fuchsia
      fontSize: 48,
      isBold: true,
      animation: 'bounce' as AnimationType
    },
    previewBg: "bg-green-900/30",
    previewText: "text-green-400 font-[Bangers]"
  },
  {
    name: "Cinema",
    style: {
      fontFamily: 'Montserrat',
      textColor: '#e2e8f0',
      highlightColor: '#ffffff',
      fontSize: 28,
      isBold: true,
      animation: 'slide' as AnimationType
    },
    previewBg: "bg-black",
    previewText: "text-white font-[Montserrat] tracking-widest"
  }
];

const fontOptions = [
  // Essentials / Sans Serif
  { label: 'Inter (Default)', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: '"Open Sans"' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Oswald', value: 'Oswald' },
  { label: 'Raleway', value: 'Raleway' },
  { label: 'Nunito', value: 'Nunito' },
  { label: 'Rubik', value: 'Rubik' },
  { label: 'Ubuntu', value: 'Ubuntu' },
  { label: 'Work Sans', value: '"Work Sans"' },
  { label: 'Quicksand', value: 'Quicksand' },
  { label: 'Fira Sans', value: '"Fira Sans"' },
  { label: 'PT Sans', value: '"PT Sans"' },
  { label: 'Josefin Sans', value: '"Josefin Sans"' },
  { label: 'Titillium Web', value: '"Titillium Web"' },
  { label: 'Source Sans 3', value: '"Source Sans 3"' },
  { label: 'Exo 2', value: '"Exo 2"' },
  { label: 'Cabin', value: 'Cabin' },
  { label: 'Dosis', value: 'Dosis' },
  { label: 'League Spartan', value: '"League Spartan"' },
  { label: 'Space Grotesk', value: '"Space Grotesk"' },
  { label: 'DM Sans', value: '"DM Sans"' },
  
  // Display / Impact / Bold
  { label: 'Anton (Impact)', value: 'Anton' },
  { label: 'Bebas Neue', value: '"Bebas Neue"' },
  { label: 'Bangers (Comic)', value: 'Bangers' },
  { label: 'Righteous', value: 'Righteous' },
  { label: 'Lobster', value: 'Lobster' },
  { label: 'Abril Fatface', value: '"Abril Fatface"' },
  { label: 'Ruslan Display', value: '"Ruslan Display"' },
  { label: 'Monoton', value: 'Monoton' },
  { label: 'Creepster', value: 'Creepster' },
  { label: 'Rye', value: 'Rye' },

  // Handwriting / Script
  { label: 'Permanent Marker', value: '"Permanent Marker"' },
  { label: 'Pacifico', value: 'Pacifico' },
  { label: 'Fredoka', value: 'Fredoka' },
  { label: 'Architects Daughter', value: '"Architects Daughter"' },
  { label: 'Shadows Into Light', value: '"Shadows Into Light"' },
  { label: 'Indie Flower', value: '"Indie Flower"' },
  { label: 'Dancing Script', value: '"Dancing Script"' },
  { label: 'Great Vibes', value: '"Great Vibes"' },
  { label: 'Satisfy', value: 'Satisfy' },
  { label: 'Courgette', value: 'Courgette' },
  
  // Serif / Slab
  { label: 'Playfair Display', value: '"Playfair Display"' },
  { label: 'Merriweather', value: 'Merriweather' },
  { label: 'Lora', value: 'Lora' },
  { label: 'Arvo', value: 'Arvo' },
  { label: 'Zilla Slab', value: '"Zilla Slab"' },

  // Monospace
  { label: 'Inconsolata', value: 'Inconsolata' },
  { label: 'Source Code Pro', value: '"Source Code Pro"' },
];

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  currentTime,
  isGenerating,
  hasVideo,
  subtitleStyle,
  onUpdateSubtitle,
  onDeleteSubtitle,
  onAddSubtitle,
  onGenerate,
  onUpdateStyle,
  onSeek,
  onExport,
  t,
  currentLang,
  onLanguageChange
}) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Favorite Fonts State
  const [favoriteFonts, setFavoriteFonts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('snapsub_fav_fonts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('snapsub_fav_fonts', JSON.stringify(favoriteFonts));
  }, [favoriteFonts]);

  // Auto-scroll to active subtitle
  useEffect(() => {
    if (activeRef.current && listRef.current) {
       const rect = activeRef.current.getBoundingClientRect();
       const listRect = listRef.current.getBoundingClientRect();
       if (rect.top < listRect.top || rect.bottom > listRect.bottom) {
          activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
    }
  }, [currentTime]); 

  const toggleBold = () => {
    onUpdateStyle({ ...subtitleStyle, isBold: !subtitleStyle.isBold });
  };

  const updateFont = (font: string) => {
    onUpdateStyle({ ...subtitleStyle, fontFamily: font });
  };

  const toggleFavoriteFont = (font: string) => {
    if (favoriteFonts.includes(font)) {
      setFavoriteFonts(prev => prev.filter(f => f !== font));
    } else {
      setFavoriteFonts(prev => [...prev, font]);
    }
  };

  const updateFontSize = (size: number) => {
    onUpdateStyle({ ...subtitleStyle, fontSize: size });
  };

  const applyPreset = (preset: typeof PRESET_STYLES[0]) => {
    onUpdateStyle({ ...subtitleStyle, ...preset.style });
  };

  const updateAnimation = (anim: AnimationType) => {
    onUpdateStyle({ ...subtitleStyle, animation: anim });
  };

  // Filter font lists
  const favOptions = fontOptions.filter(f => favoriteFonts.includes(f.value));
  const otherOptions = fontOptions.filter(f => !favoriteFonts.includes(f.value));

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-white/10 w-full md:w-96 flex-shrink-0 shadow-xl z-10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/95 backdrop-blur">
        <h2 className="font-semibold text-lg text-white">{t?.editor?.title || "Captions"}</h2>
        <div className="flex gap-2">
            <button 
                onClick={onExport}
                disabled={subtitles.length === 0}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                title={t?.editor?.title || "Export Subtitles"}
            >
                <Download size={18} />
            </button>
        </div>
      </div>

      {/* Action Bar / Style Menu */}
      <div className="p-4 bg-[#0a0a0a] border-b border-white/10 space-y-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
        
        {/* Generate Button */}
        <button
          onClick={onGenerate}
          disabled={isGenerating || !hasVideo}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
            isGenerating 
              ? 'bg-zinc-800 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-900/20'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t?.editor?.generating || "Generating..."}</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>{t?.editor?.autoGen || "Auto-Generate"}</span>
            </>
          )}
        </button>
        
        {/* Presets Section */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Palette size={12} /> {t?.editor?.quickStyles || "Quick Styles"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_STYLES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`h-12 rounded-lg border border-zinc-800 flex items-center justify-center transition-all relative overflow-hidden group ${preset.previewBg}`}
              >
                <span className={`text-sm z-10 ${preset.previewText}`}>{preset.name}</span>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Animation Section */}
        <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap size={12} /> {t?.editor?.animations || "Entrance Animation"}
            </label>
            <div className="grid grid-cols-5 gap-1">
                {(['none', 'pop', 'slide', 'fade', 'bounce'] as AnimationType[]).map((anim) => (
                    <button
                        key={anim}
                        onClick={() => updateAnimation(anim)}
                        className={`py-1.5 rounded text-[10px] font-medium uppercase transition-colors border ${
                            subtitleStyle.animation === anim
                            ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                            : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:bg-zinc-800'
                        }`}
                    >
                        {anim}
                    </button>
                ))}
            </div>
        </div>

        {/* Text & Layout Customization */}
        <div className="pt-2 border-t border-zinc-800">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Type size={12} /> {t?.editor?.textLayout || "Text & Layout"}
          </label>
          
          <div className="space-y-4 mb-3">
            {/* Font Family with Favorites */}
            <div className="flex gap-2">
              <select 
                value={subtitleStyle.fontFamily}
                onChange={(e) => updateFont(e.target.value)}
                className="flex-1 bg-zinc-900 text-gray-200 text-sm rounded-md border border-zinc-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 p-2 outline-none"
              >
                {favOptions.length > 0 && (
                  <optgroup label="Favorites">
                    {favOptions.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value.replace(/"/g, '') }}>
                        {font.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={favOptions.length > 0 ? "All Fonts" : undefined}>
                  {otherOptions.map((font) => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value.replace(/"/g, '') }}>
                      {font.label}
                    </option>
                  ))}
                </optgroup>
              </select>

              <button 
                onClick={() => toggleFavoriteFont(subtitleStyle.fontFamily)}
                className={`p-2 rounded-md border transition-colors ${
                   favoriteFonts.includes(subtitleStyle.fontFamily) 
                   ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                   : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:text-white'
                }`}
                title="Favorite this font"
              >
                <Star size={16} fill={favoriteFonts.includes(subtitleStyle.fontFamily) ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Font Size */}
            <div>
               <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">{t?.editor?.size || "Size"}</label>
                  <span className="text-xs text-gray-400 font-mono">{subtitleStyle.fontSize}px</span>
               </div>
               <input 
                 type="range" 
                 min="16" 
                 max="96" 
                 step="2"
                 value={subtitleStyle.fontSize} 
                 onChange={(e) => updateFontSize(parseInt(e.target.value))}
                 className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
               />
            </div>

            {/* Vertical Position */}
            <div>
               <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                    <ArrowUpFromLine size={10} /> {t?.editor?.vertPos || "Vertical Position"}
                  </label>
                  <span className="text-xs text-gray-400 font-mono">{subtitleStyle.verticalPosition ?? 15}%</span>
               </div>
               <input 
                 type="range" 
                 min="5" 
                 max="90" 
                 step="1"
                 value={subtitleStyle.verticalPosition ?? 15} 
                 onChange={(e) => onUpdateStyle({ ...subtitleStyle, verticalPosition: parseInt(e.target.value) })}
                 className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
               />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">{t?.editor?.fill || "Fill"}</label>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md p-1">
                     <input 
                       type="color" 
                       value={subtitleStyle.textColor}
                       onChange={(e) => onUpdateStyle({ ...subtitleStyle, textColor: e.target.value })}
                       className="w-8 h-6 bg-transparent cursor-pointer border-none p-0" 
                     />
                     <span className="text-[10px] text-gray-400 font-mono truncate">{subtitleStyle.textColor}</span>
                  </div>
               </div>
               <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">{t?.editor?.highlight || "Highlight"}</label>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md p-1">
                     <input 
                       type="color" 
                       value={subtitleStyle.highlightColor}
                       onChange={(e) => onUpdateStyle({ ...subtitleStyle, highlightColor: e.target.value })}
                       className="w-8 h-6 bg-transparent cursor-pointer border-none p-0" 
                     />
                     <span className="text-[10px] text-gray-400 font-mono truncate">{subtitleStyle.highlightColor}</span>
                  </div>
               </div>
            </div>
          </div>

          <button 
            onClick={toggleBold}
            className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border transition-all ${
              subtitleStyle.isBold 
                ? 'bg-brand-500/20 border-brand-500 text-brand-400' 
                : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Bold size={16} />
            <span className="text-sm font-medium">{t?.editor?.bold || "Bold Text"}</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 relative bg-black">
        {subtitles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-center">
                <p className="text-sm">{t?.editor?.noCaptions || "No captions yet."}</p>
                <p className="text-xs mt-1 opacity-60">{t?.editor?.noCaptionsDesc || "Generate them with AI or add manually."}</p>
            </div>
        ) : (
            subtitles.map((sub) => {
              const isActive = isTimeInRange(currentTime, sub.startTime, sub.endTime);
              return (
                <div
                  key={sub.id}
                  ref={isActive ? activeRef : null}
                  className={`relative group p-3 rounded-lg border transition-all duration-200 ${
                    isActive 
                      ? 'bg-zinc-900 border-brand-500/50 shadow-md shadow-brand-900/10 ring-1 ring-brand-500/20' 
                      : 'bg-zinc-900/40 border-transparent hover:bg-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  {/* Time Controls */}
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-gray-400">
                    <Clock size={12} />
                    <input
                      type="text"
                      value={sub.startTime}
                      onChange={(e) => onUpdateSubtitle(sub.id, { startTime: e.target.value })}
                      className="bg-transparent w-20 hover:text-white focus:text-brand-400 focus:outline-none transition-colors"
                    />
                    <span>→</span>
                    <input
                      type="text"
                      value={sub.endTime}
                      onChange={(e) => onUpdateSubtitle(sub.id, { endTime: e.target.value })}
                      className="bg-transparent w-20 hover:text-white focus:text-brand-400 focus:outline-none transition-colors"
                    />
                    
                    <button 
                        onClick={() => onSeek(parseTime(sub.startTime))}
                        className="ml-auto p-1 hover:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Jump to time"
                    >
                        <MoveUp size={12} className="rotate-90" />
                    </button>
                  </div>

                  <textarea
                    value={sub.text}
                    onChange={(e) => onUpdateSubtitle(sub.id, { text: e.target.value })}
                    className="w-full bg-transparent text-gray-200 text-sm resize-none focus:outline-none focus:ring-0 leading-relaxed"
                    rows={2}
                  />

                  <button
                    onClick={() => onDeleteSubtitle(sub.id)}
                    className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-black">
        <button
          onClick={onAddSubtitle}
          className="w-full py-2 border border-dashed border-zinc-700 hover:border-zinc-500 text-gray-400 hover:text-gray-200 rounded-lg flex items-center justify-center gap-2 text-sm transition-all"
        >
          <Plus size={16} />
          {t?.editor?.addBtn || "Add New Caption"}
        </button>
      </div>
    </div>
  );
};

export default SubtitleEditor;