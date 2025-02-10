import JSZip from 'jszip';

interface ExtractedFile {
  name: string;
  content: string;
}

export async function extractArchive(file: File): Promise<ExtractedFile[]> {
  const extractedFiles: ExtractedFile[] = [];

  if (file.name.endsWith('.zip')) {
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(file);

    for (const [path, zipEntry] of Object.entries(zipContents.files)) {
      if (!zipEntry.dir) {
        const content = await zipEntry.async('text');
        extractedFiles.push({
          name: path,
          content: content,
        });
      }
    }
  } else if (file.name.endsWith('.rar')) {
    // Note: Due to limitations with RAR format in browsers,
    // we'll show a message to the user to use ZIP instead
    throw new Error('RAR format is not supported in the browser. Please use ZIP format instead.');
  }

  return extractedFiles;
}

export function isArchiveFile(file: File): boolean {
  return file.name.endsWith('.zip') || file.name.endsWith('.rar');
} 