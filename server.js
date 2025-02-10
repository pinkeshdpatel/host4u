import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import FormData from 'form-data';
import JSZip from 'jszip';
import fs from 'fs';
import AdmZip from 'adm-zip';

// Get directory name in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const NETLIFY_TOKEN = process.env.VITE_NETLIFY_TOKEN; // This is now optional
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

// Validate required environment variables
if (!GITHUB_TOKEN) {
  console.error('GitHub token is not configured. Please set GITHUB_TOKEN in your .env file');
  process.exit(1);
}

if (!GITHUB_USERNAME) {
  console.error('GitHub username is not configured. Please set GITHUB_USERNAME in your .env file');
  process.exit(1);
}

// Remove Netlify token validation since we're not using it
// if (!NETLIFY_TOKEN) {
//   console.error('Netlify token is not configured. Please set VITE_NETLIFY_TOKEN in your .env file');
//   process.exit(1);
// }

// Define allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://host4u-web.onrender.com',
  'https://pinkeshdpatel.github.io'
];

// Create Express app
const app = express();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Add authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get user data from Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Supabase auth error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Store user data in request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      error: 'Authentication failed',
      details: error.message
    });
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create a ZIP file from the uploaded files
async function createDeploymentZip(files) {
  const zip = new JSZip();
  console.log('\nStarting ZIP creation process...');
  console.log('Number of files to process:', files.length);
  
  for (const file of files) {
    console.log('\nProcessing file:', file.originalname);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.mimetype);
    
    if (file.originalname.endsWith('.zip')) {
      console.log('Processing ZIP file contents...');
      // Extract ZIP contents
      const zipContent = await JSZip.loadAsync(file.buffer);
      
      // Check if files are inside a root directory
      const rootDirs = new Set();
      const entries = Object.entries(zipContent.files);
      
      console.log('Files found in ZIP:', entries.length);
      
      // Get all root directories
      entries.forEach(([path]) => {
        const parts = path.split('/');
        if (parts.length > 1) {
          rootDirs.add(parts[0]);
        }
      });

      console.log('Root directories found:', Array.from(rootDirs));

      // If there's a single root directory, we'll strip it
      const stripPrefix = rootDirs.size === 1 ? Array.from(rootDirs)[0] + '/' : '';
      if (stripPrefix) {
        console.log('Stripping prefix:', stripPrefix);
      }
      
      for (const [path, zipEntry] of entries) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('nodebuffer');
          // Remove the root directory from the path if it exists
          const finalPath = stripPrefix ? path.replace(stripPrefix, '') : path;
          zip.file(finalPath, content);
          console.log('Added file to deployment:', finalPath, '(', content.length, 'bytes)');
        }
      }
    } else {
      // For regular files, add them directly
      zip.file(file.originalname, file.buffer);
      console.log('Added file to deployment:', file.originalname, '(', file.buffer.length, 'bytes)');
    }
  }
  
  // Log the final contents of the deployment ZIP
  const zipContents = Object.keys(zip.files);
  console.log('\nFinal deployment ZIP contents:', zipContents);
  console.log('Number of files in ZIP:', zipContents.length);
  
  const finalZip = await zip.generateAsync({ 
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  
  console.log('Final ZIP size:', finalZip.length, 'bytes');
  return finalZip;
}

async function checkDeploymentStatus(siteId, deployId, token) {
  const response = await fetch(
    `${NETLIFY_API}/sites/${siteId}/deploys/${deployId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to check deployment status');
  }
  
  const status = await response.json();
  console.log('Current deployment status:', status.state, status.state === 'processing' ? '(Files are being processed)' : '');
  
  // Check for specific states
  if (status.state === 'error' && status.error_message) {
    throw new Error(`Deployment failed: ${status.error_message}`);
  }
  
  return status;
}

async function waitForDeployment(siteId, deployId, token, maxAttempts = 30) {
  let lastStatus = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkDeploymentStatus(siteId, deployId, token);
    lastStatus = status;
    
    switch (status.state) {
      case 'ready':
        console.log('Deployment is live at:', status.ssl_url);
        return true;
      case 'error':
        throw new Error(`Deployment failed: ${status.error_message || 'Unknown error'}`);
      case 'processing':
        console.log('Processing deployment...');
        break;
      case 'uploading':
        console.log('Uploading files...');
        break;
      case 'preparing':
        console.log('Preparing deployment...');
        break;
      case 'initiated':
        console.log('Deployment initiated...');
        break;
      case 'new':
        console.log('Setting up new deployment...');
        break;
      case 'building':
        console.log('Building site...');
        break;
      default:
        console.log('Current state:', status.state);
    }
    
    // Wait 5 seconds between checks
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // If we timeout but have a URL, consider it successful
  if (lastStatus && lastStatus.ssl_url) {
    console.log('Deployment is still processing, returning available URL:', lastStatus.ssl_url);
    return true;
  }
  
  // If we timeout and don't have a URL, throw an error
  console.log('Last known deployment status:', lastStatus);
  throw new Error('Deployment timed out - please check Netlify dashboard');
}

async function deployToGitHub(uploadedFiles, repoName) {
  try {
    // Create deployment ZIP
    console.log('Creating deployment ZIP...');
    const zipBuffer = await createDeploymentZip(uploadedFiles);
    console.log('ZIP created, size:', zipBuffer.length);

    // Create a temporary directory for deployment
    const tempDir = path.join(process.cwd(), 'temp_deploy');
    const zipPath = path.join(tempDir, 'deploy.zip');
    
    // Ensure temp directory exists and is empty
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir);

    // Write the ZIP file
    fs.writeFileSync(zipPath, zipBuffer);

    // Extract the ZIP file
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    // Remove the ZIP file as we don't need it anymore
    fs.unlinkSync(zipPath);

    // Create a new repository on GitHub
    console.log('Creating GitHub repository...');
    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        private: false,
        auto_init: false,
        has_pages: true,
      }),
    });

    if (!createRepoResponse.ok) {
      const error = await createRepoResponse.text();
      throw new Error(`Failed to create repository: ${error}`);
    }

    const repo = await createRepoResponse.json();
    console.log('Created repository:', repo.full_name);

    // Upload files to the repository
    const dirFiles = fs.readdirSync(tempDir);
    for (const file of dirFiles) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        const content = fs.readFileSync(filePath, 'base64');
        
        const uploadResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/contents/${file}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `Add ${file}`,
              content: content,
              branch: 'main',
            }),
          }
        );

        if (!uploadResponse.ok) {
          console.error(`Failed to upload ${file}:`, await uploadResponse.text());
        }
      } else if (stats.isDirectory()) {
        // Handle directories recursively
        const uploadDir = async (dirPath, repoPath) => {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const repoFilePath = path.join(repoPath, file).replace(/\\/g, '/');
            
            if (fs.statSync(fullPath).isFile()) {
              const content = fs.readFileSync(fullPath, 'base64');
              
              const uploadResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/contents/${repoFilePath}`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message: `Add ${repoFilePath}`,
                    content: content,
                    branch: 'main',
                  }),
                }
              );

              if (!uploadResponse.ok) {
                console.error(`Failed to upload ${repoFilePath}:`, await uploadResponse.text());
              }
            } else {
              await uploadDir(fullPath, repoFilePath);
            }
          }
        };

        await uploadDir(filePath, file);
      }
    }

    // Enable GitHub Pages
    console.log('Enabling GitHub Pages...');
    const enablePagesResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/pages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.switcheroo-preview+json',
        },
        body: JSON.stringify({
          source: {
            branch: 'main',
          },
        }),
      }
    );

    if (!enablePagesResponse.ok) {
      console.error('Failed to enable GitHub Pages:', await enablePagesResponse.text());
      throw new Error('Failed to enable GitHub Pages');
    }

    // Wait for GitHub Pages to be ready
    console.log('Waiting for GitHub Pages to be ready...');
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!isReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/pages`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.switcheroo-preview+json',
          },
        }
      );
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('GitHub Pages status:', status.status);
        
        if (status.status === 'built') {
          isReady = true;
          break;
        }
      }
      
      attempts++;
    }

    if (!isReady) {
      console.log('GitHub Pages is taking longer than expected to be ready.');
      console.log('The site will be available at the URL shortly.');
    }

    // Create a default branch protection rule
    console.log('Setting up branch protection...');
    await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/branches/main/protection`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.luke-cage-preview+json',
        },
        body: JSON.stringify({
          required_status_checks: null,
          enforce_admins: false,
          required_pull_request_reviews: null,
          restrictions: null,
        }),
      }
    );

    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true });

    // Return the GitHub Pages URL
    const deployUrl = `https://${GITHUB_USERNAME}.github.io/${repoName}`;
    console.log('Final deploy URL:', deployUrl);
    console.log('Note: It may take a few minutes for GitHub Pages to fully deploy your site.');
    
    return {
      url: deployUrl,
      repo: `https://github.com/${GITHUB_USERNAME}/${repoName}`,
      message: 'Site is being deployed. It may take a few minutes to be fully accessible.',
    };
  } catch (error) {
    console.error('Deployment error:', error);
    // Clean up temporary directory if it exists
    const tempDir = path.join(process.cwd(), 'temp_deploy');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    throw error;
  }
}

// Update the upload endpoint to use authentication
app.post('/api/upload', authenticateUser, upload.array('files'), async (req, res) => {
  try {
    console.log('Starting upload process...');
    console.log('Authenticated user:', req.user.id);
    console.log('Received files:', req.files?.map(f => ({ name: f.originalname, size: f.size })));
    console.log('Game name:', req.body.gameName);
    
    // Validate files
    if (!req.files || req.files.length === 0) {
      console.error('No files received in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Use provided game name or generate one
    const gameName = req.body.gameName || `game-${Date.now()}`;
    console.log('Using game name:', gameName);
    const repoName = gameName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    console.log('Repository name:', repoName);

    // Check for index.html or zip
    const hasIndexHtml = req.files.some(file => 
      file.originalname === 'index.html' || 
      file.originalname.endsWith('/index.html')
    );

    const zipFiles = req.files.filter(file => file.originalname.endsWith('.zip'));
    const hasZip = zipFiles.length > 0;
    console.log('Has index.html:', hasIndexHtml);
    console.log('Has ZIP files:', hasZip);

    // If we have a ZIP file, verify it contains an index.html
    if (hasZip) {
      console.log('Checking ZIP files for index.html...');
      let zipHasIndexHtml = false;
      for (const zipFile of zipFiles) {
        try {
          const zipContent = await JSZip.loadAsync(zipFile.buffer);
          zipHasIndexHtml = Object.keys(zipContent.files).some(path => 
            path === 'index.html' || path.endsWith('/index.html')
          );
          if (zipHasIndexHtml) break;
        } catch (error) {
          console.error('Error processing ZIP file:', error);
          return res.status(400).json({ 
            error: 'Failed to process ZIP file',
            details: error.message
          });
        }
      }
      
      if (!zipHasIndexHtml) {
        console.error('No index.html found in ZIP files');
        return res.status(400).json({ 
          error: 'ZIP archive must contain an index.html file' 
        });
      }
    } else if (!hasIndexHtml) {
      console.error('No index.html found in uploaded files');
      return res.status(400).json({ 
        error: 'Upload must include an index.html file or a ZIP archive containing one' 
      });
    }

    // Create temporary directory for deployment
    const tempDir = path.join(process.cwd(), 'temp_deploy');
    console.log('Creating temporary directory:', tempDir);
    
    try {
      // Ensure temp directory exists and is empty
      if (fs.existsSync(tempDir)) {
        console.log('Cleaning existing temporary directory');
        fs.rmSync(tempDir, { recursive: true });
      }
      fs.mkdirSync(tempDir);
      console.log('Temporary directory created successfully');

      // Deploy to GitHub Pages
      console.log('Starting GitHub Pages deployment...');
      const deployment = await deployToGitHub(req.files, repoName);
      console.log('Deployment successful:', deployment);

      // Save to Supabase
      console.log('Saving game information to database...');
      const { data, error: dbError } = await supabase
        .from('games')
        .insert({
          name: gameName,
          url: deployment.url,
          repo_url: deployment.repo,
          user_id: req.user.id,
          created_at: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error details:', {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
        
        // Check if the error is due to missing table
        if (dbError.code === '42P01') {
          throw new Error('Database table "games" does not exist. Please create the table first.');
        }
        
        // Check if it's a foreign key violation
        if (dbError.code === '23503') {
          throw new Error('Invalid user ID or reference.');
        }
        
        // Check if it's a unique constraint violation
        if (dbError.code === '23505') {
          throw new Error('A game with this name already exists.');
        }
        
        throw new Error(`Failed to save game information: ${dbError.message}`);
      }

      if (!data) {
        throw new Error('Failed to save game information: No data returned');
      }

      console.log('Game information saved successfully:', data);

      res.json({ 
        message: 'Game deployed successfully',
        url: deployment.url,
        repo: deployment.repo,
        status: 'deploying',
        note: 'GitHub Pages may take 1-3 minutes to make your site accessible.',
        name: gameName
      });
    } finally {
      // Clean up temporary directory
      if (fs.existsSync(tempDir)) {
        console.log('Cleaning up temporary directory');
        fs.rmSync(tempDir, { recursive: true });
      }
    }
  } catch (error) {
    console.error('Upload process error:', error);
    // Clean up temporary directory if it exists
    const tempDir = path.join(process.cwd(), 'temp_deploy');
    if (fs.existsSync(tempDir)) {
      console.log('Cleaning up temporary directory after error');
      fs.rmSync(tempDir, { recursive: true });
    }
    
    res.status(500).json({ 
      error: 'Failed to process upload',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update the games endpoint to use authentication
app.get('/api/games', authenticateUser, async (req, res) => {
  try {
    console.log('Fetching games for user:', req.user.id);
    
    // Get games from Supabase
    const { data: games, error: dbError } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Database error when fetching games:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      throw dbError;
    }

    console.log('Found games:', games?.length || 0);
    console.log('Games data:', games);

    res.json({ games: games || [] });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ 
      error: 'Failed to fetch games',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Server configuration:');
  console.log('- CORS origins:', allowedOrigins);
  console.log(`- Supabase connection: ${supabaseUrl ? 'Configured' : 'Missing'}`);
  console.log(`- Netlify token: ${NETLIFY_TOKEN ? 'Present' : 'Missing'}`);
}); 