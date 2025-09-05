module.exports = {
  "git": {
    "requireCleanWorkingDir": false,
    "commit": false,
    "tag": false,
    "push": false,
    "tagMatch": "v[0-9]*.[0-9]*.[0-9]*"
  },
  "github": {
    "release": true,
    "releaseName": "Release v${version}",
    "releaseNotes": null // Will use conventional changelog
  },
  "npm": {
    "publish": false, // VS Code extensions don't publish to npm
    "skipChecks": true
  },
  "hooks": {
    "after:release": [
      "echo ${version} > .release-version",
      "echo 'Released v${version}! 🎉'"
    ]
  },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "angular",
      "infile": "CHANGELOG.md",
      "header": "# Changelog\n\nAll notable changes to the Lockor VS Code extension will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n",
      "whatBump": (commits, options) => {
        let defaults = {
          test: 'ignore',
          build: 'ignore',
          ci: 'ignore',
          docs: 'ignore', 
          chore: 'patch',
          style: 'patch',
          fix: 'patch',
          perf: 'patch',
          refactor: 'patch',
          feat: 'minor',
          major: 'major',
        }

        // Get commit types from preset configuration
        let types = (options?.preset?.types || [])
          .reduce((a, v) => {
            return { ...a, [v.type]: v.release}
          }, {}) 

        types = Object.assign({}, defaults, types)
        let breakings = 0
        let features = 0
        let levelSet = ['major', 'minor', 'patch', 'ignore']
        
        let level = Math.min.apply(Math, commits.map(commit => {
          let level = levelSet.indexOf(types[commit.type])
          level = level < 0 ? 3 : level
          
          if (commit.notes.length > 0) {
            breakings += commit.notes.length
          }
          if (commit.type === 'feat') {
            features += 1;
          }
          return level
        }))

        // Force major version for breaking changes
        if (breakings > 0) {
          level = 0; // major
        }

        return {
          level: level,
          reason: breakings === 1
            ? `There is ${breakings} BREAKING CHANGE and ${features} features`
            : `There are ${breakings} BREAKING CHANGES and ${features} features`
        }
      }
    }
  }
}