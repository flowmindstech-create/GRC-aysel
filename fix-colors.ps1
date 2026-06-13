$srcPath = "C:\Users\Baxa\.gemini\antigravity-ide\scratch\maliyye\src"
$files = Get-ChildItem -Recurse -Include "*.tsx" -Path $srcPath

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content

    # indigo -> sky replacements
    $content = $content -replace 'bg-indigo-600', 'bg-sky-500'
    $content = $content -replace 'bg-indigo-700', 'bg-sky-600'
    $content = $content -replace 'bg-indigo-500', 'bg-sky-500'
    $content = $content -replace 'bg-indigo-400', 'bg-sky-400'
    $content = $content -replace 'text-indigo-600', 'text-sky-500'
    $content = $content -replace 'text-indigo-500', 'text-sky-500'
    $content = $content -replace 'text-indigo-400', 'text-sky-400'
    $content = $content -replace 'text-indigo-300', 'text-sky-300'
    $content = $content -replace 'border-indigo-500', 'border-sky-500'
    $content = $content -replace 'border-indigo-700', 'border-sky-600'
    $content = $content -replace 'shadow-indigo-600', 'shadow-sky-500'
    $content = $content -replace 'shadow-indigo-900', 'shadow-sky-900'
    $content = $content -replace 'ring-indigo-500', 'ring-sky-500'
    $content = $content -replace 'focus:ring-indigo-500', 'focus:ring-sky-500'
    $content = $content -replace 'focus:border-indigo-500', 'focus:border-sky-500'
    $content = $content -replace 'hover:text-indigo-600', 'hover:text-sky-400'
    $content = $content -replace 'hover:text-indigo-400', 'hover:text-sky-400'
    $content = $content -replace 'hover:bg-indigo-700', 'hover:bg-sky-600'
    $content = $content -replace 'hover:bg-indigo-500', 'hover:bg-sky-500'

    # purple -> sky replacements
    $content = $content -replace 'bg-purple-600', 'bg-sky-500'
    $content = $content -replace 'bg-purple-700', 'bg-sky-600'
    $content = $content -replace 'bg-purple-500', 'bg-sky-500'
    $content = $content -replace 'text-purple-500', 'text-sky-400'
    $content = $content -replace 'text-purple-400', 'text-sky-400'
    $content = $content -replace 'shadow-purple-600', 'shadow-sky-500'
    $content = $content -replace 'hover:bg-purple-700', 'hover:bg-sky-600'
    $content = $content -replace 'hover:bg-purple-600', 'hover:bg-sky-500'
    $content = $content -replace 'focus:ring-purple-500', 'focus:ring-sky-500'
    $content = $content -replace 'focus:border-purple-500', 'focus:border-sky-500'
    $content = $content -replace 'accent-purple-600', 'accent-sky-500'

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "Updated: $($file.Name)"
    } else {
        Write-Host "No change: $($file.Name)"
    }
}

Write-Host "All done!"
