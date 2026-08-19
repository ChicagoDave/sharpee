is there a way to execute Direct Distribution on an archived build in xcode from the command line?

Yes. The command-line equivalent of choosing "Distribute App" → "Direct Distribution" in Xcode Organizer is xcodebuild -exportArchive, paired with an export options plist.

1. Export options plist (e.g. ExportOptions.plist):

xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>developer-id</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
</dict>
</plist>
For macOS apps distributed outside the App Store, the method value is developer-id — that's what corresponds to "Direct Distribution" in the Organizer UI (Developer ID–signed, ready for notarization). There's no literal direct method string; developer-id is the one that maps to it.

2. Run the export:

bash
xcodebuild -exportArchive \
  -archivePath /path/to/YourApp.xcarchive \
  -exportPath /path/to/output \
  -exportOptionsPlist ExportOptions.plist
That produces the signed .app (or .pkg, if you add <key>method</key><string>developer-id</string> with packaging options / distributionBundleIdentifier etc.).

3. Notarize it (Direct Distribution in the Organizer also notarizes automatically — from the CLI you do this as a separate step):

bash
xcrun notarytool submit /path/to/YourApp.zip \
  --keychain-profile "YOUR_PROFILE" \
  --wait
(Set up --keychain-profile once via xcrun notarytool store-credentials.)

4. Staple the ticket:

bash
xcrun stapler staple /path/to/YourApp.app
So the full pipeline replicating Organizer's "Direct Distribution" button is: xcodebuild -exportArchive (method developer-id) → notarytool submit --wait → stapler staple. If you want, I can help write a script that chains all three steps together for your project.