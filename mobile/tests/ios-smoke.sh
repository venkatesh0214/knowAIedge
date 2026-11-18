#!/usr/bin/env bash
# Launch the built app and check that WKWebView actually paints the shared reader.
set -euo pipefail
app_path=${1:?Pass the built simulator app path}
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
device=$(xcrun simctl list devices available --json | python3 -c '
import json, sys
devices = json.load(sys.stdin)["devices"]
for runtime in sorted(devices, reverse=True):
    for device in devices[runtime]:
        if device["name"].startswith("iPhone") and device.get("isAvailable"):
            print(device["udid"])
            sys.exit()
sys.exit("No iPhone simulator installed")
')
xcrun simctl bootstatus "$device" -b
xcrun simctl install "$device" "$app_path"
xcrun simctl launch "$device" fyi.knowaiedge.reader

cat > "$work_dir/ReadScreen.swift" <<'SWIFT'
import Foundation
import Vision
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
try VNImageRequestHandler(url: URL(fileURLWithPath: CommandLine.arguments[1])).perform([request])
let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string.lowercased() }.joined(separator: " ")
exit(text.contains("daily briefing") && text.contains("watchlist") ? 0 : 1)
SWIFT
xcrun swiftc "$work_dir/ReadScreen.swift" -o "$work_dir/read-screen"
for attempt in {1..12}; do
  xcrun simctl io "$device" screenshot "$work_dir/reader.png"
  if "$work_dir/read-screen" "$work_dir/reader.png"; then
    echo "iPhone simulator rendered Daily briefing and Watchlist navigation."
    exit 0
  fi
  sleep 2
done
echo "The reader did not appear on the iPhone simulator." >&2
exit 1
