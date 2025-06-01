import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { BookText, Feather, Moon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else if (!isLogin) {
        toast({
          title: "Success!",
          description: "Check your email to confirm your account"
        });
      } else {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F1] dark:bg-[#1C1917] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#EAE5E0] dark:bg-[#292524] items-center justify-center p-12">
        <div className="max-w-lg">
          <div className="mb-8">
            <Feather className="w-12 h-12 text-[#8B7355] dark:text-[#A89985]" />
          </div>
          <h1 className="text-5xl font-serif text-[#2C1810] dark:text-[#E5E5E5] mb-6">
            Your personal space for reflection
          </h1>
          <p className="text-lg text-[#5C4033] dark:text-[#9CA3AF] leading-relaxed">
            Capture your thoughts, memories, and reflections in a beautiful, private journal. 
            Let your words flow freely in this tranquil space designed for mindful self-expression.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-8">
            <div>
              <BookText className="w-6 h-6 text-[#8B7355] dark:text-[#A89985] mb-3" />
              <h3 className="font-serif text-[#2C1810] dark:text-[#E5E5E5] text-lg mb-2">Thoughtful Design</h3>
              <p className="text-[#5C4033] dark:text-[#9CA3AF]">Crafted for focus and clarity</p>
            </div>
            <div>
              <Moon className="w-6 h-6 text-[#8B7355] dark:text-[#A89985] mb-3" />
              <h3 className="font-serif text-[#2C1810] dark:text-[#E5E5E5] text-lg mb-2">Private Space</h3>
              <p className="text-[#5C4033] dark:text-[#9CA3AF]">Your thoughts, your sanctuary</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="font-serif text-3xl text-[#2C1810] dark:text-[#E5E5E5] mb-2">
              {isLogin ? 'Welcome back' : 'Create your journal'}
            </h2>
            <p className="text-[#5C4033] dark:text-[#9CA3AF]">
              {isLogin ? 'Continue your journey of self-reflection' : 'Begin your journey of self-discovery'}
            </p>
          </div>

          <div className="mb-8">
            <div className="flex space-x-4 mb-8">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 text-base font-medium rounded-lg transition-all ${
                  isLogin 
                    ? 'bg-[#2C1810] text-white dark:bg-[#A89985] dark:text-[#1C1917]' 
                    : 'text-[#5C4033] hover:bg-[#EAE5E0] dark:text-[#9CA3AF] dark:hover:bg-[#292524]'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 text-base font-medium rounded-lg transition-all ${
                  !isLogin 
                    ? 'bg-[#2C1810] text-white dark:bg-[#A89985] dark:text-[#1C1917]' 
                    : 'text-[#5C4033] hover:bg-[#EAE5E0] dark:text-[#9CA3AF] dark:hover:bg-[#292524]'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-[#292524] border border-[#D1C4B6] dark:border-[#44403C] rounded-lg text-[#2C1810] dark:text-[#E5E5E5] placeholder:text-[#8B7355] dark:placeholder:text-[#78716C] focus:border-[#8B7355] dark:focus:border-[#A89985]"
                />
              )}
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white dark:bg-[#292524] border border-[#D1C4B6] dark:border-[#44403C] rounded-lg text-[#2C1810] dark:text-[#E5E5E5] placeholder:text-[#8B7355] dark:placeholder:text-[#78716C] focus:border-[#8B7355] dark:focus:border-[#A89985]"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white dark:bg-[#292524] border border-[#D1C4B6] dark:border-[#44403C] rounded-lg text-[#2C1810] dark:text-[#E5E5E5] placeholder:text-[#8B7355] dark:placeholder:text-[#78716C] focus:border-[#8B7355] dark:focus:border-[#A89985]"
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2C1810] hover:bg-[#3D261C] dark:bg-[#A89985] dark:hover:bg-[#8B7355] text-white dark:text-[#1C1917] py-3 rounded-lg font-medium transition-all duration-200"
              >
                {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </form>
          </div>

          <p className="text-center text-[#5C4033] dark:text-[#9CA3AF] text-sm">
            A mindful space for your daily reflections ✨
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
