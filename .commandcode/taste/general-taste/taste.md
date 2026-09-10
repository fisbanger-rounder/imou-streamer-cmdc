# General Taste
- Prefers deploying web apps to zero-config serverless hosting platforms (Vercel or equivalent) rather than self-managed servers. Confidence: 0.8
- Works on Windows (cmd/PowerShell, paths under `C:\Users\...\OneDrive\...`); commands and scripts should be Windows-compatible. Confidence: 0.8
- Supplies official vendor SDKs locally plus links to official docs, and expects those to be read/consulted before implementation instead of guessing APIs. Confidence: 0.7
- Gives high-level goals and leaves architecture/stack decisions to the assistant; does not micromanage implementation details. Confidence: 0.6
- Prefers to handle git commits and pushes to remote repositories themselves; the assistant should stage/edit files and then instruct the user to commit and push, rather than running `git commit` / `git push` on the user's behalf. Confidence: 0.85
- When reporting errors, often appends a hypothesis about the cause (e.g. "I think the url should be include a port"). The assistant should evaluate these hypotheses but ultimately defer to evidence from official sources/SDK code rather than acting on unverified guesses. Confidence: 0.6
- When the API call succeeds (no error code) but the UI shows empty/wrong data, expects the assistant to verify the response field names against the official SDK source rather than assuming the frontend is parsing correctly. Confidence: 0.7
