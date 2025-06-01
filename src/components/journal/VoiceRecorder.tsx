import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

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

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Reset state
        setIsRecording(false);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Recording visualization */}
      <div className="mb-6">
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
      </div>

      {/* Timer and status */}
      <div className="text-center space-y-2">
        {isRecording && (
          <>
            <p className="font-mono text-xl text-[#2C1810] dark:text-[#E5E5E5]">
              {formatTime(recordingTime)}
            </p>
            <p className="text-[#8B7355] dark:text-[#A89985] text-sm animate-pulse">
              Recording...
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
