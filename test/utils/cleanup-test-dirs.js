/**
 * Cleanup utility for test directories
 * Removes any leftover test directories from failed test runs
 */

const fs = require('fs');
const path = require('path');

function cleanupTestDirectories() {
  const currentDir = process.cwd();
  const testDirPattern = /^test-(temp-git-repo|manual-scenarios)-\d+$/;
  
  try {
    const entries = fs.readdirSync(currentDir);
    
    for (const entry of entries) {
      if (testDirPattern.test(entry)) {
        const fullPath = path.join(currentDir, entry);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          console.log(`Cleaning up test directory: ${entry}`);
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      }
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupTestDirectories();
}

module.exports = { cleanupTestDirectories };
