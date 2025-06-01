import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, X } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Only create and send blob if we have chunks and it wasn't cancelled
        if (isRecording && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          onRecordingComplete(blob);
        }
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    setIsRecording(false); // Set this first to prevent the onstop handler from processing
    cleanup();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Recording visualization */}
      <div className="mb-6 flex items-center space-x-4">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className={`w-20 h-20 rounded-full p-0 transition-all duration-300 ${
            isRecording 
              ? 'bg-[#2C1810] hover:bg-[#3D261C] dark:bg-[#A89985] dark:hover:bg-[#8B7355]' 
              : 'bg-[#2C1810] hover:bg-[#3D261C] dark:bg-[#A89985] dark:hover:bg-[#8B7355]'
          }`}
        >
          {isRecording ? (
            <Square className="w-8 h-8 text-white dark:text-[#1C1917]" />
          ) : (
            <Mic className="w-8 h-8 text-white dark:text-[#1C1917]" />
          )}
        </Button>
        {isRecording && (
          <Button
            onClick={cancelRecording}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 p-0"
          >
            <X className="w-6 h-6 text-white" />
          </Button>
        )}
      </div>

      {/* Timer and status */}
      <div className="text-center space-y-2">
        {isRecording && (
          <>
            <p className="font-mono text-xl text-[#2C1810] dark:text-[#E5E5E5]">
              {formatTime(recordingTime)}
            </p>
            <p className="text-[#8B7355] dark:text-[#A89985] text-sm animate-pulse">
              Recording... (click square to save, X to cancel)
            </p>
          </>
        )}
        {!isRecording && !disabled && (
          <p className="text-[#5C4033] dark:text-[#9CA3AF] text-sm">
            Click to start recording
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
