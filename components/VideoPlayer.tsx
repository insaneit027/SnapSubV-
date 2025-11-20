import React, { useRef, useEffect } from 'react';
import { Subtitle, VideoState, SubtitleStyle } from '../types';
import { isTimeInRange, parseTime } from '../utils/time';
import { Play, Pause, Upload } from 'lucide-react';

interface VideoPlayerProps {
  videoState: VideoState;
  subtitles: Subtitle[];
  subtitleStyle: SubtitleStyle;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayPause: (isPlaying: boolean) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  seekTo: number | null;
  t?: any;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoState,
  subtitles,
  subtitleStyle,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  onFileUpload,
  seekTo,
  t
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle external seek
  useEffect(() => {
    if (seekTo !== null && videoRef.current) {
      if (Math.abs(videoRef.current.currentTime - seekTo) > 0.1) {
         videoRef.current.currentTime = seekTo;
      }
    }
  }, [seekTo]);

  // Sync Play/Pause state
  useEffect(() => {
    if (videoRef.current) {
      if (videoState.isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(e => console.error("Play failed", e));
      } else if (!videoState.isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [videoState.isPlaying]);

  // High-frequency update loop for smooth karaoke sync
  useEffect(() => {
    let animationFrameId: number;

    const updateLoop = () => {
      if (videoRef.current && !videoRef.current.paused) {
        onTimeUpdate(videoRef.current.currentTime);
      }
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [onTimeUpdate]);

  const togglePlay = () => {
    onPlayPause(!videoState.isPlaying);
  };

  const currentSubtitle = subtitles.find(sub => 
    isTimeInRange(videoState.currentTime, sub.startTime, sub.endTime)
  );

  // Logic for Word-by-Word Highlighting
  const renderCaption = () => {
    if (!currentSubtitle) return null;

    const words = currentSubtitle.text.trim().split(/\s+/);
    // Safely handle empty word case
    if (!words || words.length === 0 || (words.length === 1 && words[0] === '')) return null;

    const start = parseTime(currentSubtitle.startTime);
    const end = parseTime(currentSubtitle.endTime);
    const duration = Math.max(0.1, end - start); // Prevent divide by zero
    const elapsed = Math.max(0, videoState.currentTime - start);
    
    // Calculate which word should be active based on linear time distribution
    let activeIndex = 0; // Default to first word
    if (duration > 0.1 && words.length > 1) {
      const timePerWord = duration / words.length;
      activeIndex = Math.floor(elapsed / timePerWord);
      activeIndex = Math.max(0, Math.min(activeIndex, words.length - 1));
    }

    const activeWord = words[activeIndex] || words[0];

    // Animation Class Lookup
    const animClass = {
      'none': '',
      'pop': 'anim-pop',
      'slide': 'anim-slide',
      'fade': 'anim-fade',
      'bounce': 'anim-bounce'
    }[subtitleStyle.animation || 'none'];

    return (
      <div 
        key={`${currentSubtitle.id}-${activeIndex}`} // Key changes on every WORD change to restart animation
        className={`absolute left-0 right-0 flex flex-wrap justify-center px-4 md:px-12 pointer-events-none z-50 ${animClass}`}
        style={{ bottom: `${subtitleStyle.verticalPosition ?? 15}%` }}
      >
        <div className="text-center leading-tight">
            <span 
              className="inline-block mx-1.5 caption-text transform scale-110"
              style={{ 
                fontSize: `${subtitleStyle.fontSize}px`,
                fontFamily: subtitleStyle.fontFamily,
                color: subtitleStyle.highlightColor,
                fontWeight: subtitleStyle.isBold ? 800 : 400,
              }}
            >
              {activeWord}
            </span>
        </div>
      </div>
    );
  };

  // Empty State
  if (!videoState.url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 space-y-6 p-8 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
        <div className="p-6 bg-zinc-900 rounded-full shadow-xl ring-1 ring-white/5">
          <Upload size={40} className="text-brand-400" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-xl font-medium text-white mb-2">{t?.upload?.title || "Upload a Video"}</h3>
          <p className="text-sm text-gray-400 mb-6">{t?.upload?.desc || "Start by uploading a video to generate AI captions automatically. Supports MP4, MOV, and WebM."}</p>
          <label className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg cursor-pointer transition-all transform hover:scale-105 font-medium shadow-lg shadow-brand-500/20">
            <span>{t?.upload?.btn || "Select from computer"}</span>
            <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              onChange={onFileUpload}
            />
          </label>
        </div>
      </div>
    );
  }

  // Loaded State
  return (
    <div className="relative flex flex-col bg-black rounded-lg overflow-hidden shadow-2xl border border-zinc-800 max-w-full max-h-full animate-in fade-in zoom-in duration-300">
      {/* Video Container */}
      <div className="relative group/video">
        <video
          ref={videoRef}
          src={videoState.url}
          className="block max-w-full max-h-[70vh] object-contain mx-auto" 
          onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
          onEnded={() => onPlayPause(false)}
          onClick={togglePlay}
        />
        
        {/* Subtitle Overlay */}
        {renderCaption()}

        {/* Play/Pause Overlay */}
        <div 
          className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity duration-200 ${videoState.isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}
          onClick={togglePlay}
        >
          <button className="p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/10 hover:bg-brand-500/90 transition-all transform hover:scale-110 shadow-xl">
            {videoState.isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-zinc-900 cursor-pointer group relative" 
           onClick={(e) => {
             if (!videoRef.current) return;
             const rect = e.currentTarget.getBoundingClientRect();
             const percent = (e.clientX - rect.left) / rect.width;
             videoRef.current.currentTime = percent * videoRef.current.duration;
           }}>
        <div 
          className="h-full bg-brand-500 relative transition-all duration-100 ease-out" 
          style={{ width: `${(videoState.currentTime / videoState.duration) * 100}%` }}
        >
           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-lg shadow-black/50 transform scale-0 group-hover:scale-100 transition-all" />
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;