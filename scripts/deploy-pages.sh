#!/usr/bin/env bash
set -euo pipefail

# Publica o build estático sem trocar a branch nem alterar o índice de trabalho.
task_repo_root=$(git rev-parse --show-toplevel)
cd "$task_repo_root"
test -f pages/index.html
test -f pages/anexo-coelho-savassi.pdf
task_git_dir=$(git rev-parse --absolute-git-dir)
task_pages_root="$task_repo_root/pages"
task_pages_tmp_dir=$(mktemp -d /tmp/coelho-pages.XXXXXX)
trap 'rm -rf -- "$task_pages_tmp_dir"' EXIT

task_pages_parent=''
if git ls-remote --exit-code --heads origin refs/heads/gh-pages > "$task_pages_tmp_dir/remote"; then
  git fetch --no-tags origin refs/heads/gh-pages
  task_pages_parent=$(git rev-parse FETCH_HEAD)
else
  task_remote_status=$?
  if [ "$task_remote_status" -ne 2 ]; then
    exit "$task_remote_status"
  fi
fi

export GIT_INDEX_FILE="$task_pages_tmp_dir/index"
git read-tree --empty
git -C "$task_pages_root" --git-dir="$task_git_dir" --work-tree="$task_pages_root" add --all
task_pages_tree=$(git write-tree)
if [ -n "$task_pages_parent" ]; then
  task_pages_commit=$(git commit-tree "$task_pages_tree" -p "$task_pages_parent" -m 'Publish Coelho-Savassi demonstration')
else
  task_pages_commit=$(git commit-tree "$task_pages_tree" -m 'Publish Coelho-Savassi demonstration')
fi
unset GIT_INDEX_FILE
git push origin "$task_pages_commit:refs/heads/gh-pages"
echo 'Branch gh-pages enviada. A ativação do site nas configurações do GitHub é uma etapa separada.'
