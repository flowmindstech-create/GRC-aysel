$srcPath = "C:\Users\Baxa\.gemini\antigravity-ide\scratch\maliyye\src"
$files = Get-ChildItem -Recurse -Include "*.tsx","*.ts","*.css" -Path $srcPath

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content

    # Indigo / violet hex -> sky blue
    $content = $content -replace '#6366f1', '#0ea5e9'
    $content = $content -replace '#6366F1', '#0ea5e9'
    $content = $content -replace '#8b5cf6', '#0ea5e9'
    $content = $content -replace '#8B5CF6', '#0ea5e9'
    $content = $content -replace '#818cf8', '#38bdf8'
    $content = $content -replace '#a5b4fc', '#7dd3fc'

    # Dark indigo backgrounds -> dark navy equivalents
    $content = $content -replace '#312e81', '#0c2d4e'
    $content = $content -replace '#312E81', '#0c2d4e'
    $content = $content -replace '#1e1b4b', '#0a1929'
    $content = $content -replace '#1E1B4B', '#0a1929'
    $content = $content -replace '#4f46e5', '#0ea5e9'
    $content = $content -replace '#4F46E5', '#0ea5e9'

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "All hex replacements done!"
