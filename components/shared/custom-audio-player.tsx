"use client";

import { useState, useRef, useEffect } from "react";
import { PlayIcon, PauseIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CustomAudioPlayer({ src }: { src: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("durationchange", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("durationchange", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (duration === 0 || duration === Infinity) {
        setDuration(audio.duration || 0);
      }
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex w-full min-w-[200px] sm:min-w-[240px] items-center gap-3 rounded-xl py-1 text-inherit">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={togglePlayPause}
        className="group/btn relative flex size-10 shrink-0 items-center justify-center rounded-full overflow-hidden text-inherit transition-transform active:scale-95"
      >
        <div className="absolute inset-0 bg-current opacity-10 transition-opacity group-hover/btn:opacity-20" />
        <div className="relative z-10">
          {isPlaying ? (
            <PauseIcon className="size-4 fill-current" />
          ) : (
            <PlayIcon className="size-4 fill-current ml-0.5" />
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col justify-center">
        <div className="relative flex h-5 items-center group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 z-20 w-full cursor-pointer appearance-none bg-transparent opacity-0"
          />
          {/* Custom track */}
          <div className="absolute h-1.5 w-full rounded-full overflow-hidden">
             <div className="absolute inset-0 bg-current opacity-20" />
             {/* Progress fill */}
             <div 
               className="absolute h-full rounded-full bg-current" 
               style={{ width: `${progressPercent}%` }} 
             />
          </div>
          {/* Thumb */}
          <div 
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-current shadow-sm scale-0 transition-transform group-hover:scale-100 z-10"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
        
        <div className="mt-0.5 flex justify-between text-[10px] font-medium opacity-80">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
