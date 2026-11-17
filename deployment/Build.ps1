# Rebuilds the "publish" folder from src. Run this on your own computer after editing the content,
# photos or code, then commit and push both src and publish.
# Needs the .NET 10 SDK: https://dotnet.microsoft.com/download/dotnet/10.0
[CmdletBinding()]
param([string]$DotnetPath = 'dotnet')
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$project = Join-Path $root 'src\Storefront.csproj'
$publish = Join-Path $root 'publish'
$stagingRoot = [IO.Path]::GetFullPath((Join-Path $root '.build-staging'))
$staging = [IO.Path]::GetFullPath((Join-Path $stagingRoot ([Guid]::NewGuid().ToString('N'))))

if (-not (Get-Command $DotnetPath -ErrorAction SilentlyContinue)) { throw 'The .NET SDK was not found. Install the .NET 10 SDK, then open a new PowerShell window.' }

try {
    New-Item -ItemType Directory -Path $staging -Force | Out-Null
    & $DotnetPath publish $project -c Release -r win-x64 --self-contained false -o $staging --nologo
    if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed. Read the error above (often a typo in src\Content\catalog.json).' }

    # Mirror the new build into publish, keeping files the server creates (certificate checks, logs, keys).
    & robocopy.exe $staging $publish /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP /XD '.well-known' 'logs' 'App_Data' /XF 'app_offline.htm'
    if ($LASTEXITCODE -ge 8) { throw 'Copying the build into the publish folder failed.' }
} finally {
    $checkedStaging = [IO.Path]::GetFullPath($staging)
    $expectedPrefix = $stagingRoot.TrimEnd('\') + '\'
    if (-not $checkedStaging.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Build cleanup path is outside the project staging folder.' }
    if (Test-Path -LiteralPath $checkedStaging) { Remove-Item -LiteralPath $checkedStaging -Recurse -Force }
}
Write-Host 'publish folder updated. Preview with: dotnet run --project src, then commit src and publish together.' -ForegroundColor Green
