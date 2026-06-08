import subprocess
import sys

def test_forms():
    cmd = [
        "powershell",
        "-NoProfile",
        "-Command",
        "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Videos Directory'; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }"
    ]
    print("Testing System.Windows.Forms.FolderBrowserDialog...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print("STDOUT:", res.stdout.strip())
    print("STDERR:", res.stderr.strip())
    print("RETURN CODE:", res.returncode)

def test_com():
    cmd = [
        "powershell",
        "-NoProfile",
        "-Command",
        "$sh = New-Object -ComObject Shell.Application; $f = $sh.BrowseForFolder(0, 'Select Folder', 0); if ($f) { $f.Self.Path }"
    ]
    print("\nTesting COM Shell.Application...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print("STDOUT:", res.stdout.strip())
    print("STDERR:", res.stderr.strip())
    print("RETURN CODE:", res.returncode)

if __name__ == "__main__":
    test_forms()
    test_com()
