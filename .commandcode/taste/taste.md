# General Taste

- Prefers deploying web apps to zero-config serverless hosting platforms (Vercel or equivalent) rather than self-managed servers. Confidence: 0.8
- Works on Windows (cmd/PowerShell, paths under `C:\Users\...\OneDrive\...`); commands and scripts should be Windows-compatible. Confidence: 0.8
- Supplies official vendor SDKs locally plus links to official docs, and expects those to be read/consulted before implementation instead of guessing APIs. Confidence: 0.7
- Gives high-level goals and leaves architecture/stack decisions to the assistant; does not micromanage implementation details. Confidence: 0.6
- Prefers to handle git commits and pushes to remote repositories themselves; the assistant should stage/edit files and then instruct the user to commit and push, rather than running `git commit` / `git push` on the user's behalf. Confidence: 0.85
