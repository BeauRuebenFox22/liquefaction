param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$ScriptDir\bin\cli.js" $Args
