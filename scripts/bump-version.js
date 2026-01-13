import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;
  
  console.log(`Current version: ${currentVersion}`);
  
  const type = await question('Bump type (major/minor/patch) [patch]: ') || 'patch';
  const message = await question('Changelog message: ');
  
  if (!message) {
    console.error('Changelog message is required!');
    rl.close();
    process.exit(1);
  }

  const [major, minor, patch] = currentVersion.split('.').map(Number);
  let newVersion;

  switch (type.toLowerCase()) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
  }

  console.log(`Bumping to version: ${newVersion}`);

  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  // Update CHANGELOG.md
  const date = new Date().toISOString().split('T')[0];
  const header = `## [${newVersion}] - ${date}`;
  const logEntry = `${header}\n### Changed\n- ${message}\n\n`;
  
  let changelogContent = '';
  if (fs.existsSync(changelogPath)) {
    changelogContent = fs.readFileSync(changelogPath, 'utf-8');
    // Insert after the first header (usually "# Changelog")
    const lines = changelogContent.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('# Changelog')) {
        insertIndex = i + 1; // Skip title
        // Skip empty lines after title
        while (lines[insertIndex] && lines[insertIndex].trim() === '') {
          insertIndex++;
        }
        break;
      }
    }
    
    // If we couldn't find "# Changelog", just prepend
    if (insertIndex === 0 && !lines[0].startsWith('# Changelog')) {
      changelogContent = `# Changelog\n\n${logEntry}${changelogContent}`;
    } else {
      const before = lines.slice(0, insertIndex).join('\n');
      const after = lines.slice(insertIndex).join('\n');
      changelogContent = `${before}\n\n${logEntry}${after}`;
    }
  } else {
    changelogContent = `# Changelog\n\n${logEntry}`;
  }

  fs.writeFileSync(changelogPath, changelogContent);

  console.log('Done! Version bumped and changelog updated.');
  rl.close();
}

main().catch(console.error);
