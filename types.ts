
export interface Subtitle {
  id: string;
  startTime: string; // Format "MM:SS.mmm"
  endTime: string;   // Format "MM:SS.mmm"
  text: string;
}

export type AnimationType = 'none' | 'pop' | 'slide' | 'fade' | 'bounce';

export interface SubtitleStyle {
  fontFamily: string;
  textColor: string;
  highlightColor: string;
  fontSize: number;
  isBold: boolean;
  animation: AnimationType;
  verticalPosition?: number; // Percentage from bottom (0-100)
}

export interface VideoState {
  file: File | null;
  url: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
}

export enum ExportFormat {
  SRT = 'srt',
  VTT = 'vtt',
  TXT = 'txt'
}

export type ExportResolution = '720p' | '1080p';
