import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Globe, Zap } from 'lucide-react';

const Home = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Free Game Website Hosting Made Simple
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload your game files and get instant hosting with a shareable link.
          No technical knowledge required.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Upload className="w-5 h-5 mr-2" />
          Start Uploading
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <Upload className="w-8 h-8 text-indigo-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Easy Upload</h3>
          <p className="text-gray-600">
            Drag and drop your files or click to upload. We handle the rest.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <Globe className="w-8 h-8 text-indigo-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Instant Hosting</h3>
          <p className="text-gray-600">
            Your files are automatically hosted and ready to share within seconds.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <Zap className="w-8 h-8 text-indigo-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
          <p className="text-gray-600">
            Optimized hosting ensures your game website loads quickly for visitors.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to host your game?</h2>
        <p className="text-lg mb-6">
          Join thousands of game developers who trust us with their hosting needs.
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Get Started Now
        </Link>
      </div>
    </div>
  );
};

export default Home;