import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, LayoutDashboard, Home, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal';
import toast from 'react-hot-toast';

const Navbar = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(supabase.auth.getUser());

  supabase.auth.onAuthStateChange((event, session) => {
    setUser(session?.user || null);
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
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