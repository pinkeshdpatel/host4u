import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, File, Loader, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { deployToNetlify } from '../lib/netlify';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const GameUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [deployedUrl, setDeployedUrl] = useState('');
  const navigate = useNavigate();

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress('Preparing files...');

    try {
      // Check for index.html
      const hasIndexHtml = files.some(file => 
        file.name === 'index.html' || 
        file.name.endsWith('/index.html') ||
        file.type === 'application/zip' // We'll check ZIP contents during deployment
      );

      if (!hasIndexHtml) {
        throw new Error('Your upload must include an index.html file');
      }

      // Deploy to Netlify
      setUploadProgress('Deploying your game...');
      const deployedUrl = await deployToNetlify(files);
      setDeployedUrl(deployedUrl);

      // Save to Supabase
      const { error: dbError } = await supabase.from('games').insert({
        name: files[0].name.split('.')[0],
        url: deployedUrl,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (dbError) throw dbError;

      toast.success('Game uploaded and deployed successfully!', {
        duration: 5000,
      });
    } catch (err) {
      const error = err as Error;
      console.error('Upload error:', error);
      toast.error(error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      toast.error('Please sign in to upload files');
      return;
    }

    if (acceptedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    handleUpload(acceptedFiles);
  }, []);

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

export default GameUpload; 