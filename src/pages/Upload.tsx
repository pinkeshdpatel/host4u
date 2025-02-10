import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, File, Loader, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Upload = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [deployedUrl, setDeployedUrl] = useState('');
  const [gameName, setGameName] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check authentication status on component mount
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (!currentSession) {
        navigate('/login');
      }
    };
    
    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!session) {
      toast.error('Please sign in to upload files');
      navigate('/login');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Preparing files...');

    try {
      // Get current session token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        throw new Error('Authentication token not found. Please sign in again.');
      }

      // Check for index.html
      const hasIndexHtml = files.some(file => 
        file.name === 'index.html' || 
        file.name.endsWith('/index.html') ||
        file.type === 'application/zip'
      );

      if (!hasIndexHtml) {
        throw new Error('Your upload must include an index.html file or be a ZIP archive');
      }

      // Validate game name
      if (!gameName.trim()) {
        throw new Error('Please enter a name for your game');
      }

      // Create FormData
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Add game name to form data
      formData.append('gameName', gameName.trim());

      // Upload to server with auth header
      setUploadProgress('Uploading and deploying your game...');
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to upload game');
      }

      setDeployedUrl(data.url);
      toast.success('Game uploaded and deployed successfully!', {
        duration: 5000,
      });
      
      // Redirect to dashboard after successful upload
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload game');
      setUploadProgress('');
    } finally {
      setIsUploading(false);
    }
  }, [session, gameName, navigate]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!session) {
      toast.error('Please sign in to upload files');
      navigate('/login');
      return;
    }

    if (acceptedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    handleUpload(acceptedFiles);
  }, [session, navigate, handleUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html'],
      'text/css': ['.css'],
      'text/javascript': ['.js'],
      'application/json': ['.json'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/zip': ['.zip'],
    },
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">
          Upload Your Game
        </h1>
        <p className="text-gray-400">
          Drag and drop your game files or a ZIP archive containing your game.
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="gameName" className="block text-sm font-medium text-gray-300 mb-2">
          Game Name
        </label>
        <input
          type="text"
          id="gameName"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="Enter a name for your game"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-400"
          disabled={isUploading}
        />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-purple-500 bg-gray-800/50'
            : 'border-gray-700 hover:border-purple-500 hover:bg-gray-800/30'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-lg text-gray-300">{uploadProgress}</p>
          </div>
        ) : (
          <>
            <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-300 mb-2">
              {isDragActive
                ? 'Drop the files here...'
                : 'Drag & drop files here, or click to select files'}
            </p>
            <p className="text-sm text-gray-400">
              Supported files: HTML, CSS, JavaScript, Images, Audio, and ZIP archives
            </p>
          </>
        )}
      </div>

      {deployedUrl && (
        <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <h2 className="text-lg font-semibold text-green-400 mb-2">Game Deployed Successfully!</h2>
          <p className="text-gray-300 mb-4">Your game is now available at:</p>
          <a
            href={deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 break-all"
          >
            {deployedUrl}
          </a>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Upload Guidelines</h2>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-center">
            <File className="w-5 h-5 mr-2 text-purple-500" />
            Make sure your main file is named "index.html"
          </li>
          <li className="flex items-center">
            <Archive className="w-5 h-5 mr-2 text-purple-500" />
            You can upload individual files or a ZIP archive containing your game
          </li>
          <li className="flex items-center">
            <File className="w-5 h-5 mr-2 text-purple-500" />
            Include all necessary assets (images, scripts, styles, audio)
          </li>
          <li className="flex items-center">
            <File className="w-5 h-5 mr-2 text-purple-500" />
            Maximum file size: 100MB per game
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Upload;