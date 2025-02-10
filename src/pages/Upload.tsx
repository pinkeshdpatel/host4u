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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Your Game
        </h1>
        <p className="text-gray-600">
          Drag and drop your game files or a ZIP archive containing your game.
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="gameName" className="block text-sm font-medium text-gray-700 mb-2">
          Game Name
        </label>
        <input
          type="text"
          id="gameName"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="Enter a name for your game"
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isUploading}
        />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-indigo-600 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-600 hover:bg-gray-50'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <p className="text-lg text-gray-600">{uploadProgress}</p>
          </div>
        ) : (
          <>
            <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600 mb-2">
              {isDragActive
                ? 'Drop the files here...'
                : 'Drag & drop files here, or click to select files'}
            </p>
            <p className="text-sm text-gray-500">
              Supported files: HTML, CSS, JavaScript, Images, Audio, and ZIP archives
            </p>
          </>
        )}
      </div>

      {deployedUrl && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Game Deployed Successfully!</h2>
          <p className="text-green-700 mb-4">Your game is now available at:</p>
          <a
            href={deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 break-all"
          >
            {deployedUrl}
          </a>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Upload Guidelines</h2>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-center">
            <File className="w-5 h-5 mr-2 text-indigo-600" />
            Make sure your main file is named "index.html"
          </li>
          <li className="flex items-center">
            <Archive className="w-5 h-5 mr-2 text-indigo-600" />
            You can upload individual files or a ZIP archive containing your game
          </li>
          <li className="flex items-center">
            <File className="w-5 h-5 mr-2 text-indigo-600" />
            Include all necessary assets (images, scripts, styles, audio)
          </li>
          <li className="flex items-center">
            <File className="w-5 h-5 mr-2 text-indigo-600" />
            Maximum file size: 100MB per game
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Upload;