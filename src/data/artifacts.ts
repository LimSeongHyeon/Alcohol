import type { Finding, HandleRow, MalfindRow, NetRow } from "../types";

const alert = (label: string, detail: string): Finding => ({ verdict: "alert", label, detail });
const notice = (label: string, detail: string): Finding => ({ verdict: "notice", label, detail });

/** Stand-in for `windows.netscan.NetScan`. */
export const connections: NetRow[] = [
  { offset: 0x4c114a70, proto: "TCPv4", localAddr: "0.0.0.0", localPort: 135, foreignAddr: "0.0.0.0", foreignPort: 0, state: "LISTENING", pid: 812, owner: "svchost.exe", created: "2026-08-05 08:12:11", findings: [] },
  { offset: 0x4c119200, proto: "TCPv4", localAddr: "0.0.0.0", localPort: 445, foreignAddr: "0.0.0.0", foreignPort: 0, state: "LISTENING", pid: 4, owner: "System", created: "2026-08-05 08:12:05", findings: [] },
  { offset: 0x4c12ef10, proto: "TCPv4", localAddr: "0.0.0.0", localPort: 49664, foreignAddr: "0.0.0.0", foreignPort: 0, state: "LISTENING", pid: 516, owner: "wininit.exe", created: "2026-08-05 08:12:09", findings: [] },
  { offset: 0x4c1a3880, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 51204, foreignAddr: "142.250.72.14", foreignPort: 443, state: "ESTABLISHED", pid: 2104, owner: "chrome.exe", created: "2026-08-05 08:21:44", findings: [] },
  { offset: 0x4c1b9440, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 51288, foreignAddr: "52.96.104.34", foreignPort: 443, state: "ESTABLISHED", pid: 4020, owner: "OUTLOOK.EXE", created: "2026-08-05 08:16:19", findings: [] },
  {
    offset: 0xd0e77c30, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 52117,
    foreignAddr: "198.51.100.23", foreignPort: 80, state: "CLOSED", pid: 3204, owner: "powershell.exe",
    created: "2026-08-05 09:41:49",
    findings: [alert("Matches the encoded command", "The host in the decoded -enc payload. Connection opened two seconds after the process started.")],
  },
  {
    offset: 0xd137a190, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 52140,
    foreignAddr: "198.51.100.23", foreignPort: 8443, state: "ESTABLISHED", pid: 4188, owner: "rundll32.exe",
    created: "2026-08-05 09:42:06",
    findings: [alert("Beaconing host", "Same host as the PowerShell download, on a non-standard TLS port, from a process with injected memory.")],
  },
  {
    offset: 0xd1f5b0c0, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 52193,
    foreignAddr: "198.51.100.23", foreignPort: 8443, state: "ESTABLISHED", pid: 5120, owner: "beacon.exe",
    created: "2026-08-05 09:42:54",
    findings: [alert("Owned by an unlinked process", "PID 5120 does not appear in the active process list.")],
  },
  {
    offset: 0x4bda9f80, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 52088,
    foreignAddr: "203.0.113.44", foreignPort: 443, state: "ESTABLISHED", pid: 644, owner: "lsass.exe",
    created: "2026-08-05 09:42:33",
    findings: [alert("lsass.exe made an outbound connection", "lsass.exe does not initiate external traffic. Consistent with credential exfiltration.")],
  },
  { offset: 0x4c204770, proto: "UDPv4", localAddr: "0.0.0.0", localPort: 5353, foreignAddr: "*", foreignPort: 0, state: "", pid: 1044, owner: "svchost.exe", created: "2026-08-05 08:12:14", findings: [] },
  { offset: 0x4c2118e0, proto: "UDPv4", localAddr: "10.14.7.62", localPort: 138, foreignAddr: "*", foreignPort: 0, state: "", pid: 4, owner: "System", created: "2026-08-05 08:12:06", findings: [] },
  { offset: 0x4c22c350, proto: "TCPv6", localAddr: "::", localPort: 445, foreignAddr: "::", foreignPort: 0, state: "LISTENING", pid: 4, owner: "System", created: "2026-08-05 08:12:05", findings: [] },
  { offset: 0x4c98e110, proto: "TCPv4", localAddr: "0.0.0.0", localPort: 49669, foreignAddr: "0.0.0.0", foreignPort: 0, state: "LISTENING", pid: 644, owner: "lsass.exe", created: "2026-08-05 08:12:12", findings: [] },
  { offset: 0x4ca01d20, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 51877, foreignAddr: "13.107.42.14", foreignPort: 443, state: "CLOSE_WAIT", pid: 964, owner: "svchost.exe", created: "2026-08-05 09:02:11", findings: [] },
  { offset: 0x4cb14990, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 51902, foreignAddr: "20.190.159.4", foreignPort: 443, state: "ESTABLISHED", pid: 1704, owner: "MsMpEng.exe", created: "2026-08-05 09:10:58", findings: [] },
  {
    offset: 0xd15e2440, proto: "TCPv4", localAddr: "10.14.7.62", localPort: 52165,
    foreignAddr: "198.51.100.23", foreignPort: 8443, state: "ESTABLISHED", pid: 4412, owner: "svch0st.exe",
    created: "2026-08-05 09:42:22",
    findings: [notice("Third process to the same host", "198.51.100.23:8443 now has connections from three separate processes.")],
  },
];

/** Stand-in for `windows.malware.malfind.Malfind`. */
export const injections: MalfindRow[] = [
  {
    pid: 4188, process: "rundll32.exe", start: 0x1f0000, end: 0x1f8fff, tag: "VadS",
    protection: "PAGE_EXECUTE_READWRITE", commitCharge: 9, privateMemory: true,
    disasm: [
      "0x1f0000  4d 5a          dec ebp; pop edx",
      "0x1f0002  90             nop",
      "0x1f0003  0003           add [ebx], al",
      "0x1f0005  0000           add [eax], al",
      "0x1f0007  0004 00        add [eax+eax], al",
      "0x1f000a  0000           add [eax], al",
    ],
    hexdump: [
      "0x1f0000  4d 5a 90 00 03 00 00 00  04 00 00 00 ff ff 00 00   MZ..............",
      "0x1f0010  b8 00 00 00 00 00 00 00  40 00 00 00 00 00 00 00   ........@.......",
      "0x1f0020  00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................",
      "0x1f0030  00 00 00 00 00 00 00 00  00 00 00 00 e8 00 00 00   ................",
    ],
    findings: [alert("PE header in private memory", "An MZ signature at the base of a private RWX region with no mapped file.")],
  },
  {
    pid: 644, process: "lsass.exe", start: 0x2b40000, end: 0x2b4bfff, tag: "VadS",
    protection: "PAGE_EXECUTE_READWRITE", commitCharge: 12, privateMemory: true,
    disasm: [
      "0x2b40000  55             push rbp",
      "0x2b40001  48 89 e5       mov rbp, rsp",
      "0x2b40004  48 83 ec 20    sub rsp, 0x20",
      "0x2b40008  48 8b 05 ..    mov rax, [rip+0x...]",
    ],
    hexdump: [
      "0x2b40000  55 48 89 e5 48 83 ec 20  48 8b 05 61 2f 00 00 48   UH..H.. H..a/..H",
      "0x2b40010  85 c0 74 12 48 8b 40 08  48 85 c0 74 09 ff d0 eb   ..t.H.@. H..t....",
    ],
    findings: [alert("Injected code in lsass.exe", "Executable private memory inside the credential store process, matching the outbound connection at 09:42:33.")],
  },
  {
    pid: 3204, process: "powershell.exe", start: 0x7ff4a120000, end: 0x7ff4a127fff, tag: "VadS",
    protection: "PAGE_EXECUTE_READWRITE", commitCharge: 8, privateMemory: true,
    disasm: ["0x7ff4a120000  48 b8 ..     movabs rax, 0x...", "0x7ff4a12000a  ff e0        jmp rax"],
    hexdump: ["0x7ff4a120000  48 b8 00 00 00 00 00 00  00 00 ff e0 cc cc cc cc   H..............."],
    findings: [notice("Small executable stub", "Twelve bytes of a jump thunk. Common in .NET assembly loading as well as in shellcode.")],
  },
  {
    pid: 4412, process: "svch0st.exe", start: 0x400000, end: 0x41bfff, tag: "Vad ",
    protection: "PAGE_EXECUTE_WRITECOPY", commitCharge: 28, privateMemory: false,
    disasm: ["0x400000  4d 5a          dec ebp; pop edx", "0x400002  90             nop"],
    hexdump: ["0x400000  4d 5a 90 00 03 00 00 00  04 00 00 00 ff ff 00 00   MZ.............."],
    findings: [notice("Image base at 0x400000", "A fixed, non-relocated base. Typical of a compiled binary without ASLR.")],
  },
];

const HANDLE_TYPES = ["Key", "File", "Event", "Directory", "Mutant", "Section", "Thread", "Semaphore", "Token", "WindowStation", "Desktop", "ALPC Port", "IoCompletion", "TpWorkerFactory"];
const KEY_PATHS = [
  "MACHINE\\SYSTEM\\ControlSet001\\Services\\Tcpip\\Parameters",
  "MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
  "USER\\S-1-5-21-1004336348-1177238915-682003330-1004\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
  "MACHINE\\SOFTWARE\\Microsoft\\Cryptography",
  "MACHINE\\SYSTEM\\ControlSet001\\Control\\Nls\\Sorting\\Versions",
];
const FILE_PATHS = [
  "\\Device\\HarddiskVolume2\\Windows\\System32\\en-US\\KernelBase.dll.mui",
  "\\Device\\HarddiskVolume2\\Users\\j.harper\\AppData\\Local\\Temp",
  "\\Device\\HarddiskVolume2\\Windows\\WinSxS\\amd64_microsoft.windows.common-controls",
  "\\Device\\NamedPipe\\lsass",
  "\\Device\\Afd\\Endpoint",
];

/**
 * `windows.handles` over every process runs to tens of thousands of rows on a
 * real image. Generated here at that scale so the table is exercised honestly
 * rather than demonstrated on a comfortable hundred.
 */
export function generateHandles(owners: { pid: number; name: string; handles: number | null }[]): HandleRow[] {
  const rows: HandleRow[] = [];
  let seed = 0x9e3779b9;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return Math.abs(seed) / 0x7fffffff;
  };

  for (const owner of owners) {
    const count = owner.handles ?? 0;
    for (let i = 0; i < count; i++) {
      const type = HANDLE_TYPES[Math.floor(rand() * HANDLE_TYPES.length)] ?? "Event";
      let name = "";
      if (type === "Key") name = KEY_PATHS[Math.floor(rand() * KEY_PATHS.length)] ?? "";
      else if (type === "File") name = FILE_PATHS[Math.floor(rand() * FILE_PATHS.length)] ?? "";
      else if (type === "Mutant") name = `\\Sessions\\1\\BaseNamedObjects\\{${Math.floor(rand() * 0xffffffff).toString(16).padStart(8, "0")}}`;
      else if (type === "Directory") name = "\\KnownDlls";
      else if (type === "Token") name = "";
      rows.push({
        pid: owner.pid,
        process: owner.name,
        offset: 0x20000000 + Math.floor(rand() * 0xd0000000),
        handleValue: (i + 1) * 4,
        type,
        grantedAccess: [0x1f0001, 0x100020, 0x20019, 0x1fffff, 0x120089, 0x1f0003][Math.floor(rand() * 6)] ?? 0x1f0001,
        name,
      });
    }
  }
  return rows;
}
