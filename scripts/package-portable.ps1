param(
  [string]$Version = "1.0.0",
  [string]$Configuration = "release"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$targetDir = Join-Path $repoRoot "src-tauri\target\$Configuration"
$sourceExe = Join-Path $targetDir "xbao-notes.exe"
$portableOutputRoot = Join-Path $targetDir "portable"
$portableDir = Join-Path $portableOutputRoot "xBaoNotesPortable"
$zipPath = Join-Path $targetDir "xBaoNotesPortable_${Version}_x64.zip"

if (!(Test-Path -LiteralPath $sourceExe -PathType Leaf)) {
  throw "Release executable not found: $sourceExe. Run npm.cmd run tauri -- build first."
}

$resolvedTargetDir = [System.IO.Path]::GetFullPath($targetDir)
$resolvedPortableOutputRoot = [System.IO.Path]::GetFullPath($portableOutputRoot)
if (!$resolvedPortableOutputRoot.StartsWith($resolvedTargetDir, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Portable output path is outside the Tauri target directory."
}

if (Test-Path -LiteralPath $portableOutputRoot) {
  Remove-Item -LiteralPath $portableOutputRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $portableDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $portableDir "Data") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $portableDir "Attachments") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $portableDir "Backup") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $portableDir "Recycle Bin") | Out-Null

Copy-Item -LiteralPath $sourceExe -Destination (Join-Path $portableDir "xbao-notes.exe") -Force
Set-Content -LiteralPath (Join-Path $portableDir "portable.flag") -Value "xBaoNotes portable mode" -Encoding UTF8
Set-Content -LiteralPath (Join-Path $portableDir "README-Portable.txt") -Value @(
  "xBaoNotes Portable $Version",
  "",
  "Run xbao-notes.exe from this folder.",
  "All app data is stored next to the executable:",
  "- Data",
  "- Attachments",
  "- Backup",
  "- Recycle Bin",
  "",
  "Keep portable.flag in this folder. Removing it switches the app back to installed mode."
) -Encoding UTF8

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $portableDir -DestinationPath $zipPath -Force
Write-Output $zipPath
