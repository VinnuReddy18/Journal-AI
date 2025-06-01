import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, LogOut, BookText, Calendar, Feather, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Journal {
  id: string;
  title: string;
  summary: string;
  thumbnail_url: string;
  created_at: string;
  mood_score: number;
  status: 'recording' | 'processing' | 'completed';
}

const JournalDashboard = () => {
  const { user, signOut } = useAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    try {
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load journals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewJournal = async () => {
    try {
      const { data, error } = await supabase
        .from('journals')
        .insert({
          user_id: user?.id,
          title: `Journal Entry - ${format(new Date(), 'MMM dd, yyyy')}`,
          status: 'recording'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Navigate to new journal (we'll implement this route later)
      window.location.href = `/journal/${data.id}`;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create journal",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear local state first
      setJournals([]);
      
      // Attempt to sign out
      await signOut();
      
      // Force reload the page to clear all React state
      window.location.href = '/auth';
      
    } catch (error: any) {
      console.error('Sign out error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
        stack: error.stack
      });
      
      // Even if there's an error, try to force a clean slate
      localStorage.clear();
      window.location.href = '/auth';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F1] dark:bg-[#1C1917] flex items-center justify-center p-4">
        <div className="text-[#2C1810] dark:text-[#E5E5E5] text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F1] dark:bg-[#1C1917]">
      {/* Header */}
      <header className="bg-[#EAE5E0] dark:bg-[#292524] border-b border-[#D1C4B6] dark:border-[#44403C] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#2C1810] dark:bg-[#A89985] rounded-lg flex items-center justify-center">
                <Feather className="w-6 h-6 text-[#F8F5F1] dark:text-[#1C1917]" />
              </div>
              <div>
                <h1 className="text-2xl font-serif text-[#2C1810] dark:text-[#E5E5E5]">Journal</h1>
                <p className="text-sm text-[#5C4033] dark:text-[#9CA3AF] truncate max-w-[200px] sm:max-w-none">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 justify-end">
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="text-[#5C4033] hover:text-[#2C1810] dark:text-[#9CA3AF] dark:hover:text-[#E5E5E5]"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Create new journal button */}
        <div className="mb-6 sm:mb-12">
          <Button
            onClick={createNewJournal}
            className="w-full sm:w-auto bg-[#2C1810] hover:bg-[#3D261C] dark:bg-[#A89985] dark:hover:bg-[#8B7355] text-white dark:text-[#1C1917] rounded-lg px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">New Journal Entry</span>
            <span className="sm:hidden">New Entry</span>
          </Button>
        </div>

        {/* Journal grid */}
        {journals.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-[#EAE5E0] dark:bg-[#292524] rounded-lg border border-[#D1C4B6] dark:border-[#44403C] px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#2C1810] dark:bg-[#A89985] rounded-lg flex items-center justify-center mx-auto mb-6">
              <BookText className="w-8 h-8 sm:w-10 sm:h-10 text-[#F8F5F1] dark:text-[#1C1917]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif text-[#2C1810] dark:text-[#E5E5E5] mb-3">Begin Your Journey</h3>
            <p className="text-[#5C4033] dark:text-[#9CA3AF] mb-8 max-w-md mx-auto">
              Create your first journal entry and start documenting your thoughts and reflections
            </p>
            <Button
              onClick={createNewJournal}
              className="bg-[#2C1810] hover:bg-[#3D261C] dark:bg-[#A89985] dark:hover:bg-[#8B7355] text-white dark:text-[#1C1917] rounded-lg px-6 py-3"
            >
              <Feather className="w-4 h-4 mr-2" />
              Start Writing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {journals.map((journal) => (
              <Card
                key={journal.id}
                className="bg-white dark:bg-[#292524] border border-[#D1C4B6] dark:border-[#44403C] rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
                onClick={() => window.location.href = `/journal/${journal.id}`}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-[#EAE5E0] dark:bg-[#1C1917] flex items-center justify-center relative overflow-hidden">
                  {journal.thumbnail_url ? (
                    <img 
                      src={journal.thumbnail_url} 
                      alt={journal.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Moon className="w-8 h-8 sm:w-10 sm:h-10 text-[#8B7355] dark:text-[#A89985] mx-auto mb-2" />
                      <p className="text-sm text-[#5C4033] dark:text-[#9CA3AF]">Journal Entry</p>
                    </div>
                  )}
                  
                  {/* Status indicator */}
                  <div className={`absolute top-3 right-3 px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                    journal.status === 'completed' ? 'bg-[#E5EFE6] text-[#2F5A33] dark:bg-[#2F5A33] dark:text-[#E5EFE6]' :
                    journal.status === 'processing' ? 'bg-[#FFF8E6] text-[#8B6F47] dark:bg-[#8B6F47] dark:text-[#FFF8E6]' :
                    'bg-[#E6F4FF] text-[#2C5282] dark:bg-[#2C5282] dark:text-[#E6F4FF]'
                  }`}>
                    {journal.status}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-serif text-[#2C1810] dark:text-[#E5E5E5] mb-2 sm:mb-3 line-clamp-1">
                      {journal.title || 'Untitled Entry'}
                    </h3>
                    <p className="text-[#5C4033] dark:text-[#9CA3AF] text-sm mb-4 line-clamp-2">
                      {journal.summary || 'No summary available yet...'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#D1C4B6] dark:border-[#44403C]">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3 text-[#8B7355] dark:text-[#A89985]" />
                      <span className="text-xs text-[#8B7355] dark:text-[#A89985]">
                        {format(new Date(journal.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    
                    {journal.mood_score && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-[#8B7355] dark:text-[#A89985]">Mood</span>
                        <div className="flex space-x-1">
                          {[...Array(journal.mood_score)].map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 bg-[#8B7355] dark:bg-[#A89985] rounded-full"></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default JournalDashboard;
