import { spawn } from 'node:child_process';

/** A human can leave the Finder dialog open for a while; the request must not hang forever. */
const PICKER_TIMEOUT_MS = 5 * 60 * 1000;
/** AppleScript reports a user-cancelled dialog with error -128. */
const APPLESCRIPT_USER_CANCEL = '-128';

export interface DirectoryPickResult {
  success: boolean;
  cancelled?: boolean;
  path?: string;
  message: string;
}

/**
 * Opens the native folder chooser on the machine running the dashboard.
 * The browser cannot hand a filesystem path to the server, so the picker runs server-side.
 */
export function chooseDirectory(promptText = 'Select the workspace to import skills from'): Promise<DirectoryPickResult> {
  if (process.platform !== 'darwin') {
    return Promise.resolve({
      success: false,
      message: 'Native folder picker is only available on macOS; paste the workspace path instead.'
    });
  }

  const script = `POSIX path of (choose folder with prompt ${JSON.stringify(promptText)})`;

  return new Promise(resolve => {
    const child = spawn('osascript', ['-e', script], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), PICKER_TIMEOUT_MS);

    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });

    child.on('error', err => {
      clearTimeout(timer);
      resolve({ success: false, message: `Could not open the folder picker: ${err.message}` });
    });

    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        const picked = stdout.trim().replace(/\/+$/, '');
        return resolve(picked
          ? { success: true, path: picked, message: 'Folder selected.' }
          : { success: false, message: 'The folder picker returned no path.' });
      }
      if (stderr.includes(APPLESCRIPT_USER_CANCEL)) {
        return resolve({ success: false, cancelled: true, message: 'Folder selection cancelled.' });
      }
      resolve({ success: false, message: `Folder picker failed: ${stderr.trim() || `exit code ${code}`}` });
    });
  });
}
