#!/bin/sh
hook_name="$1"
shift
common_dir=$(git rev-parse --git-common-dir) || exit $?
hook_path="$common_dir/hooks/$hook_name"
if [ -f "$hook_path" ]; then
  "$hook_path" "$@"
fi
