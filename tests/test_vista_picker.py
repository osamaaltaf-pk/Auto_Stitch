import subprocess

def test_vista_dialog():
    # Modern Vista-style folder picker using standard OpenFileDialog wrapper
    cmd = [
        "powershell",
        "-NoProfile",
        "-Command",
        "Add-Type -AssemblyName System.Windows.Forms; $w = New-Object System.Windows.Forms.Form; $w.TopMost = $true; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Title = 'Select Videos Directory to Scan'; $d.Filter = 'Folders|`n'; $d.CheckFileExists = $false; $d.DereferenceLinks = $false; $d.FileName = 'Select Folder'; if ($d.ShowDialog($w) -eq 'OK') { [System.IO.Path]::GetDirectoryName($d.FileName) }"
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print("STDOUT:", res.stdout.strip())
    print("STDERR:", res.stderr.strip())
    print("RETURN CODE:", res.returncode)

if __name__ == "__main__":
    test_vista_dialog()
