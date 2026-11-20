$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $project

$godot = $env:GODOT_BIN
if (-not $godot) {
    $candidate = Get-Command godot4 -ErrorAction SilentlyContinue
    if (-not $candidate) {
        $candidate = Get-Command godot -ErrorAction SilentlyContinue
    }
    if ($candidate) {
        $godot = $candidate.Source
    }
}

if (-not $godot) {
    Write-Error "Godot 4.2+ was not found. Install it or set GODOT_BIN."
}

$renderingArgs = @("--rendering-driver", "opengl3")
if ($env:OMNIVERSE_RENDERING_ARGS) {
    $renderingArgs = $env:OMNIVERSE_RENDERING_ARGS.Split(" ")
}

& $godot @renderingArgs --path $project @args
