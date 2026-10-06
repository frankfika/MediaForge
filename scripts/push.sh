#!/usr/bin/env bash
# Push main + the latest tag to origin, after leak checks.
# Usage: bash scripts/push.sh           # checks + push
#        bash scripts/push.sh --check   # checks only (dry run, no push)
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "✗ $1" >&2; exit 1; }
note() { echo "• $1"; }

# 1. No secrets/env files in the working tree or index
if git status --short | grep -E '\.env|key|secret'; then
  fail "possible secrets in working tree (matches above). Remove them before pushing."
fi
# .env.example is a no-secret template, so anchor .env to end of name here
if git ls-files | grep -Ei '\.env$|id_rsa|\.pem$|secret'; then
  fail "possible secrets tracked by git (matches above). Untrack them before pushing."
fi

# 2. Remote must exist
url=$(git remote get-url origin 2>/dev/null) || fail "no git remote 'origin'. Add one first, e.g.:
  git remote add origin git@github.com:frankfika/MediaForge.git"

# 3. Latest tag must exist (release workflow is tag-driven)
tag=$(git describe --tags --abbrev=0 2>/dev/null) || fail "no git tags found. Create one first:
  git tag v0.1.0 && git push origin v0.1.0"

note "remote: $url"
note "tag:   $tag"
note "head:  $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

if [ "${1:-}" = "--check" ]; then
  note "dry run: all checks passed, nothing pushed"
  exit 0
fi

git push -u origin main
git push origin "$tag"

echo
if echo "$url" | grep -q github\.com; then
  repo=$(echo "$url" | sed -E 's#.*github\.com[:/]##; s#\.git$##')
  note "pushed. Create/verify the GitHub Release:"
  note "https://github.com/$repo/releases/new?tag=$tag"
else
  note "pushed (non-GitHub remote, no release link)."
fi
