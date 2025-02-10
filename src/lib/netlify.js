import JSZip from 'jszip';
import fetch from 'node-fetch';
import FormData from 'form-data';

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const NETLIFY_TOKEN = process.env.VITE_NETLIFY_TOKEN;

// Create a ZIP file from the uploaded files
async function createDeploymentZip(files) {
  const zip = new JSZip();
  
  for (const file of files) {
    if (file.name.endsWith('.zip')) {
      // Extract ZIP contents
      const zipContent = await JSZip.loadAsync(file);
      for (const [path, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('blob');
          zip.file(path, content);
        }
      }
    } else {
      // For regular files, maintain their relative paths
      const path = file.webkitRelativePath || file.name;
      zip.file(path, file);
    }
  }
  
  return zip.generateAsync({ type: 'blob' });
}

// Deploy files to Netlify
export async function deployToNetlify(files) {
  if (!NETLIFY_TOKEN) {
    throw new Error('Netlify token is not configured. Please set VITE_NETLIFY_TOKEN in your environment.');
  }

  try {
    // First create a new site
    const siteResponse = await fetch(`${NETLIFY_API}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `game-${Date.now()}`, // Unique name for each deployment
        custom_domain: null, // Use Netlify's subdomain
      }),
    });

    if (!siteResponse.ok) {
      const error = await siteResponse.text();
      throw new Error(`Failed to create Netlify site: ${error}`);
    }

    const site = await siteResponse.json();
    console.log('Created Netlify site:', site);

    // Create deployment ZIP
    const zipBlob = await createDeploymentZip(files);

    // Create FormData for deployment
    const formData = new FormData();
    formData.append('file', zipBlob, {
      filename: 'deploy.zip',
      contentType: 'application/zip',
    });

    // Deploy to the site
    const deployResponse = await fetch(
      `${NETLIFY_API}/sites/${site.id}/deploys`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NETLIFY_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Failed to deploy to Netlify: ${error}`);
    }

    const deployment = await deployResponse.json();
    console.log('Deployment successful:', deployment);
    
    // Return the SSL URL (https) of the deployed site
    return deployment.ssl_url;
  } catch (error) {
    console.error('Netlify deployment error:', error);
    throw new Error(
      'Failed to deploy site: ' + 
      (error instanceof Error ? error.message : 'Unknown error')
    );
  }
} 