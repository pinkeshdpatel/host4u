import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-purple-400 hover:text-purple-300 transition-colors">
              Host4U
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/upload"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Upload Game
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/upload"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

          <Link to="/" className="flex items-center space-x-2">
            <Upload className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-xl">GameHost</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600">
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link to="/upload" className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600">
              <Upload className="w-5 h-5" />
              <span>Upload</span>
            </Link>
            {user && (
              <Link to="/dashboard" className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600">
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
            )}
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600"
              >
                <User className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600"
              >
                <User className="w-5 h-5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </nav>
  );
};

export default Navbar;