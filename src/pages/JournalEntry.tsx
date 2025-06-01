import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import VoiceRecorder from '@/components/journal/VoiceRecorder';
import { ArrowLeft, Save, Send, Sparkles, Download, Key, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audio_url?: string;
  transcript?: string;
  created_at: string;
}

interface Journal {
  id: string;
  title: string;
  summary: string;
  thumbnail_url: string;
  status: 'recording' | 'processing' | 'completed';
  created_at: string;
}

const JournalEntry = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [journal, setJournal] = useState<Journal | null>(null);
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJournalData();
    }
    // Check for stored API key
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setOpenaiKey(storedKey);
    } else {
      setShowKeyInput(true);
    }
  }, [id]);

  const fetchJournalData = async () => {
    try {
      // Fetch journal
      const { data: journalData, error: journalError } = await supabase
        .from('journals')
        .select('*')
        .eq('id', id)
        .single();

      if (journalError) throw journalError;
      
      setJournal(journalData);
      setTitle(journalData.title || '');

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('journal_messages')
        .select('*')
        .eq('journal_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      
      // Type assertion to ensure role is properly typed
      const typedMessages: JournalMessage[] = (messagesData || []).map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant'
      }));
      
      setMessages(typedMessages);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load journal",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = () => {
    if (openaiKey.trim()) {
      localStorage.setItem('openai_api_key', openaiKey.trim());
      setShowKeyInput(false);
      toast({
        title: "API Key Saved",
        description: "Your OpenAI API key has been saved locally"
      });
    }
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const result = await response.json();
    return result.text;
  };

  const generateAIResponse = async (transcript: string): Promise<string> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate AI companion for voice journaling. Respond thoughtfully to the user\'s thoughts and feelings. Ask follow-up questions to help them explore their emotions deeper. Keep responses conversational and supportive, around 2-3 sentences.'
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate AI response');
    }

    const result = await response.json();
    return result.choices[0].message.content;
  };

  const generateSummary = async (messages: JournalMessage[]): Promise<string> => {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a skilled summarizer. Create a concise 2-3 sentence summary of the journal entry that captures the main topics, emotions, and insights discussed.'
          },
          {
            role: 'user',
            content: userMessages
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const result = await response.json();
    return result.choices[0].message.content;
  };

  const generateThumbnail = async (messages: JournalMessage[]): Promise<string> => {
    // Get all user messages
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    // First, generate an image description based on the conversation
    const descriptionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at converting journal entries into visual descriptions. Create a brief, vivid description for an image that captures the emotional essence and main themes of this journal entry. The description should be suitable for DALL-E image generation.'
          },
          {
            role: 'user',
            content: userMessages
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!descriptionResponse.ok) {
      throw new Error('Failed to generate image description');
    }

    const descriptionResult = await descriptionResponse.json();
    const imageDescription = descriptionResult.choices[0].message.content;

    // Use the generated description to create the image
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Create a minimalist, aesthetic illustration that represents: ${imageDescription}. Style: modern, artistic, subtle colors, abstract yet emotionally evocative, no text`,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate thumbnail');
    }

    const result = await response.json();
    return result.data[0].url;
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!openaiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to use AI features",
        variant: "destructive"
      });
      setShowKeyInput(true);
      return;
    }

    try {
      setIsProcessing(true);
      setSaving(true);
      
      // Upload audio file
      const fileName = `${user?.id}/${id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('journal-assets')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('journal-assets')
        .getPublicUrl(fileName);

      // Transcribe audio
      const transcript = await transcribeAudio(audioBlob);

      // Save user message to database
      const { data: messageData, error: messageError } = await supabase
        .from('journal_messages')
        .insert({
          journal_id: id,
          role: 'user',
          content: transcript,
          audio_url: publicUrl,
          transcript: transcript
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Add to local state with proper typing
      const typedMessage: JournalMessage = {
        ...messageData,
        role: 'user'
      };
      setMessages(prev => [...prev, typedMessage]);

      // Generate AI response
      const aiResponse = await generateAIResponse(transcript);
      
      const { data: aiMessageData, error: aiMessageError } = await supabase
        .from('journal_messages')
        .insert({
          journal_id: id,
          role: 'assistant',
          content: aiResponse
        })
        .select()
        .single();

      if (!aiMessageError) {
        const typedAiMessage: JournalMessage = {
          ...aiMessageData,
          role: 'assistant'
        };
        setMessages(prev => [...prev, typedAiMessage]);
      }

      toast({
        title: "Recording saved!",
        description: "Your voice note has been transcribed and AI has responded"
      });

    } catch (error: any) {
      console.error('Error processing recording:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process recording",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
      setIsProcessing(false);
    }
  };

  const deleteJournal = async () => {
    if (window.confirm('Are you sure you want to delete this journal? This action cannot be undone.')) {
      try {
        setSaving(true);
        
        // Delete all messages
        const { error: messagesError } = await supabase
          .from('journal_messages')
          .delete()
          .eq('journal_id', id);

        if (messagesError) throw messagesError;

        // Delete the journal
        const { error: journalError } = await supabase
          .from('journals')
          .delete()
          .eq('id', id);

        if (journalError) throw journalError;

        toast({
          title: "Journal deleted",
          description: "Your journal has been permanently deleted"
        });

        navigate('/');
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to delete journal",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const saveJournal = async () => {
    try {
      setSaving(true);
      
      let thumbnailUrl = journal?.thumbnail_url;
      let summary = journal?.summary;
      
      // Generate both summary and thumbnail if we have messages and API key
      if (messages.length > 0 && openaiKey) {
        try {
          // Generate summary first
          if (!summary) {
            summary = await generateSummary(messages);
          }
          
          // Generate thumbnail if not already present
          if (!thumbnailUrl) {
            thumbnailUrl = await generateThumbnail(messages);
          }
        } catch (error) {
          console.error('Failed to generate summary or thumbnail:', error);
          toast({
            title: "Note",
            description: "Failed to generate summary or thumbnail, but saving journal anyway",
            variant: "default"
          });
        }
      }

      // Update journal
      const { error } = await supabase
        .from('journals')
        .update({ 
          title,
          status: 'completed',
          thumbnail_url: thumbnailUrl,
          summary: summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Journal saved!",
        description: "Your journal entry has been saved successfully"
      });

      navigate('/');

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save journal",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F1] dark:bg-[#1C1917] flex items-center justify-center">
        <div className="text-[#2C1810] dark:text-[#E5E5E5] text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F1] dark:bg-[#1C1917] flex flex-col">
      {/* Header */}
      <header className="bg-[#EAE5E0] dark:bg-[#292524] border-b border-[#D1C4B6] dark:border-[#44403C] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                className="text-[#5C4033] hover:text-[#2C1810] dark:text-[#9CA3AF] dark:hover:text-[#E5E5E5]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-serif text-lg bg-transparent border-none focus:ring-0 text-[#2C1810] dark:text-[#E5E5E5] placeholder-[#8B7355] dark:placeholder-[#A89985] w-full sm:w-96"
                placeholder="Untitled Entry"
              />
            </div>
            <div className="flex items-center space-x-3 justify-end">
              <Button
                onClick={deleteJournal}
                variant="ghost"
                className="text-[#5C4033] hover:text-[#2C1810] dark:text-[#9CA3AF] dark:hover:text-[#E5E5E5]"
              >
                <Trash2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
              <Button
                onClick={saveJournal}
                disabled={saving}
                className="bg-[#2C1810] hover:bg-[#3D261C] dark:bg-[#A89985] dark:hover:bg-[#8B7355] text-white dark:text-[#1C1917] rounded-lg px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Save className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 min-h-[calc(100vh-12rem)]">
          {/* Recording section - Shown on top for mobile */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <Card className="bg-white dark:bg-[#292524] border border-[#D1C4B6] dark:border-[#44403C] rounded-lg p-4 sm:p-6">
              <div className="space-y-6">
                {showKeyInput ? (
                  <div className="space-y-4">
                    <h3 className="font-serif text-lg text-[#2C1810] dark:text-[#E5E5E5]">OpenAI API Key Required</h3>
                    <p className="text-sm text-[#5C4033] dark:text-[#9CA3AF]">
                      Please enter your OpenAI API key to enable AI features
                    </p>
                    <Input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 bg-[#F8F5F1] dark:bg-[#1C1917] border border-[#D1C4B6] dark:border-[#44403C] rounded-lg text-[#2C1810] dark:text-[#E5E5E5] placeholder-[#8B7355] dark:placeholder-[#A89985]"
                    />
                    <Button
                      onClick={saveApiKey}
                      className="w-full bg-[#2C1810] hover:bg-[#3D261C] dark:bg-[#A89985] dark:hover:bg-[#8B7355] text-white dark:text-[#1C1917] rounded-lg"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Save API Key
                    </Button>
                  </div>
                ) : (
                  <>
                    <VoiceRecorder onRecordingComplete={handleRecordingComplete} disabled={isProcessing} />
                    <div className="border-t border-[#D1C4B6] dark:border-[#44403C] pt-4">
                      <h3 className="font-serif text-lg text-[#2C1810] dark:text-[#E5E5E5] mb-2">Journal Stats</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#EAE5E0] dark:bg-[#1C1917] rounded-lg p-3">
                          <p className="text-[#5C4033] dark:text-[#9CA3AF] text-sm mb-1">Entries</p>
                          <p className="text-2xl font-serif text-[#2C1810] dark:text-[#E5E5E5]">
                            {messages.filter(m => m.role === 'user').length}
                          </p>
                        </div>
                        <div className="bg-[#EAE5E0] dark:bg-[#1C1917] rounded-lg p-3">
                          <p className="text-[#5C4033] dark:text-[#9CA3AF] text-sm mb-1">AI Responses</p>
                          <p className="text-2xl font-serif text-[#2C1810] dark:text-[#E5E5E5]">
                            {messages.filter(m => m.role === 'assistant').length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Messages section */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white dark:bg-[#292524] border border-[#D1C4B6] dark:border-[#44403C] rounded-lg p-4 sm:p-6 min-h-[500px] flex flex-col">
            {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center p-4">
                  <div className="space-y-3">
                    <p className="text-lg font-serif text-[#2C1810] dark:text-[#E5E5E5]">Begin Your Journal Entry</p>
                    <p className="text-sm text-[#5C4033] dark:text-[#9CA3AF]">Record your thoughts and let AI help you reflect</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                      className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                        className={`max-w-[88%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                          message.role === 'assistant'
                            ? 'bg-[#EAE5E0] dark:bg-[#1C1917] border border-[#D1C4B6] dark:border-[#44403C]'
                            : 'bg-[#2C1810] dark:bg-[#A89985] text-white dark:text-[#1C1917]'
                        }`}
                      >
                      {message.audio_url && (
                          <div className="mb-3">
                            <audio 
                              src={message.audio_url} 
                              controls 
                              className="w-full max-w-[300px] h-10" 
                            />
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <span className="text-xs text-[#8B7355] dark:text-[#A89985]">
                            {format(new Date(message.created_at), 'h:mm a')}
                      </span>
                        </div>
                    </div>
                  </div>
                ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="max-w-[88%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 bg-[#EAE5E0] dark:bg-[#1C1917] border border-[#D1C4B6] dark:border-[#44403C]">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#8B7355] dark:text-[#A89985]" />
                          <p className="text-sm text-[#8B7355] dark:text-[#A89985]">AI is thinking...</p>
                        </div>
                      </div>
              </div>
            )}
                </div>
              )}
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JournalEntry;
