import JSZip from 'jszip';

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const NETLIFY_TOKEN = import.meta.env.VITE_NETLIFY_TOKEN;

interface DeployResponse {
  id: string;
  site_id: string;
  deploy_url: string;
  url: string;
  ssl_url: string;
}

// Create a ZIP file from the uploaded files
async function createDeploymentZip(files: File[]): Promise<Blob> {
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
export async function deployToNetlify(files: File[]): Promise<string> {
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
      throw new Error('Failed to create Netlify site');
    }

    const site = await siteResponse.json();

    // Create deployment ZIP
    const zipBlob = await createDeploymentZip(files);

    // Create FormData for deployment
    const formData = new FormData();
    formData.append('file', zipBlob, 'deploy.zip');

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
      throw new Error('Failed to deploy to Netlify');
    }

    const deployment = await deployResponse.json() as DeployResponse;
    
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