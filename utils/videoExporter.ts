import { Subtitle, SubtitleStyle } from '../types';
import { parseTime } from './time';

export const exportVideo = async (
  videoFile: File,
  subtitles: Subtitle[],
  style: SubtitleStyle,
  resolution: '720p' | '1080p',
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Check abort immediately
    if (signal?.aborted) {
      return reject(new DOMException("Export cancelled", "AbortError"));
    }

    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    // IMPORTANT: Do not mute the video element, or the MediaElementSource will capture silence.
    // The audio won't play through speakers because we route it into the AudioContext graph 
    // without connecting to audioCtx.destination.
    video.muted = false; 
    video.crossOrigin = "anonymous";

    // Target Dimensions
    const targetWidth = resolution === '1080p' ? 1080 : 720;
    // Height will be calculated based on aspect ratio once video loads

    video.onloadedmetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      const targetHeight = Math.round(targetWidth / aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error("Could not create canvas context"));
        return;
      }

      // Setup Audio Recording
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      
      // Connect source to destination stream (for recorder)
      // Do NOT connect to audioCtx.destination to avoid playing through speakers during render
      source.connect(dest);

      // Capture Video Stream from Canvas
      const canvasStream = canvas.captureStream(30); // 30 FPS
      
      // Combine Tracks (Video from Canvas + Audio from File)
      // We filter out any empty audio tracks just in case
      const audioTracks = dest.stream.getAudioTracks();
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioTracks
      ];
      const combinedStream = new MediaStream(combinedTracks);

      // Determine supported MIME type
      let mimeType = 'video/webm;codecs=vp9';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')) {
        mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: resolution === '1080p' ? 8000000 : 5000000 // 8Mbps vs 5Mbps
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        if (signal?.aborted) return; // Do not resolve if aborted
        const blob = new Blob(chunks, { type: mimeType });
        
        // Cleanup
        source.disconnect();
        if (audioCtx.state !== 'closed') audioCtx.close();
        URL.revokeObjectURL(video.src);
        
        resolve(blob);
      };

      // Handle Abort Signal
      if (signal) {
        signal.addEventListener('abort', () => {
          video.pause();
          if (recorder.state === "recording") {
            recorder.stop();
          }
          try {
            source.disconnect();
            if (audioCtx.state !== 'closed') audioCtx.close();
          } catch (e) { /* ignore */ }
          URL.revokeObjectURL(video.src);
          reject(new DOMException("Export cancelled", "AbortError"));
        });
      }

      // Start Recording
      recorder.start();
      
      // Play video to start feed
      video.play().then(() => {
        // Ensure audio context is running (sometimes needed if browser suspends it)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
      }).catch(e => {
         console.error("Export playback failed", e);
         reject(e);
      });

      // Drawing Loop
      const drawFrame = () => {
        if (signal?.aborted) return; // Stop loop if aborted

        if (video.paused || video.ended) {
          if (video.ended && recorder.state === "recording") recorder.stop();
          return;
        }

        // 1. Draw Video Frame
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // 2. Draw Subtitles
        const currentTime = video.currentTime;
        const currentSubtitle = subtitles.find(sub => {
          const start = parseTime(sub.startTime);
          const end = parseTime(sub.endTime);
          return currentTime >= start && currentTime <= end;
        });

        if (currentSubtitle) {
          const words = currentSubtitle.text.trim().split(/\s+/);
          if (words.length > 0) {
            const start = parseTime(currentSubtitle.startTime);
            const end = parseTime(currentSubtitle.endTime);
            const duration = end - start;
            const elapsed = currentTime - start;
            
            // Calculate active word index
            let activeIndex = 0;
            if (duration > 0.1) {
              const timePerWord = duration / words.length;
              activeIndex = Math.floor(elapsed / timePerWord);
              activeIndex = Math.max(0, Math.min(activeIndex, words.length - 1));
            }
            
            const activeWord = words[activeIndex] || words[0];

            // Scale font size relative to 1080p/720p based on a reference width (e.g., mobile 400px)
            const referenceWidth = 400; 
            const scaleFactor = targetWidth / referenceWidth;
            const fontSize = style.fontSize * scaleFactor * 0.6; // 0.6 adjustment factor to match visual weight

            ctx.font = `${style.isBold ? 'bold' : 'normal'} ${fontSize}px ${style.fontFamily.replace(/"/g, '')}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Styling
            ctx.lineJoin = 'round';
            ctx.lineWidth = fontSize * 0.15;
            ctx.strokeStyle = 'black';
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            const x = targetWidth / 2;
            // Vertical Position
            // Style uses percentage from bottom (e.g., 15%)
            // Canvas Y is from top. So 15% bottom is 85% top.
            const vertPos = style.verticalPosition ?? 15;
            const y = targetHeight * (1 - (vertPos / 100));

            // Stroke & Fill
            ctx.strokeText(activeWord, x, y);
            ctx.fillStyle = style.highlightColor;
            ctx.fillText(activeWord, x, y);
          }
        }

        // Progress Update
        if (video.duration) {
          onProgress((currentTime / video.duration) * 100);
        }

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
    };

    video.onerror = () => reject(new Error("Error loading video file"));
  });
};
