import type { Phase, PluginEntry } from "../types";

/**
 * Steps 1–6 are the SANS memory-forensics methodology. They are numbered
 * because they are genuinely ordered: you cannot judge an injected region
 * before you know which processes are real. The groups after them are
 * reference material an analyst dips into, so they carry no number.
 */
export const phases: Phase[] = [
  {
    id: "identify",
    step: 1,
    title: "Identify processes",
    blurb: "Establish what was running, and what is hiding.",
  },
  {
    id: "objects",
    step: 2,
    title: "Process objects",
    blurb: "Command lines, modules, handles, tokens.",
  },
  {
    id: "network",
    step: 3,
    title: "Network artifacts",
    blurb: "Connections, listeners, and who owned them.",
  },
  {
    id: "injection",
    step: 4,
    title: "Code injection",
    blurb: "Executable memory with no file behind it.",
  },
  {
    id: "rootkit",
    step: 5,
    title: "Rootkit signs",
    blurb: "Hooks, unlinked modules, tampered tables.",
  },
  {
    id: "extract",
    step: 6,
    title: "Extract",
    blurb: "Carve processes, drivers and files back out.",
  },
  { id: "registry", step: null, title: "Registry", blurb: "Hives resident in memory." },
  { id: "timeline", step: null, title: "Timeline", blurb: "Every timestamped artifact, ordered." },
  { id: "credentials", step: null, title: "Credentials", blurb: "Secrets recoverable from memory." },
  { id: "scan", step: null, title: "Pattern scan", blurb: "YARA and regular expressions." },
];

const p = (
  id: string,
  summary: string,
  phase: PluginEntry["phase"],
  processScoped = false,
  unavailable: PluginEntry["unavailable"] = null,
): PluginEntry => ({
  id,
  name: id.split(".").slice(0, -1).join(".").replace(/^windows\./, "").replace(/^malware\./, ""),
  summary,
  phase,
  processScoped,
  unavailable,
  run: null,
});

/**
 * A Windows subset of the 197 plugins the framework exposes. Names and
 * descriptions are taken from the plugin classes themselves.
 *
 * `pycryptodome` is deliberately shown as missing here to exercise the
 * unavailable state: the entries stay in the list, greyed and labelled. A
 * forensics tool must never let a plugin disappear silently — an analyst who
 * cannot find `hashdump` should learn that a dependency is missing, not
 * conclude there were no credentials to find.
 */
export const plugins: PluginEntry[] = [
  // 1 — Identify
  p("windows.info.Info", "OS build, kernel base, DTB and processor layout", "identify"),
  p("windows.pslist.PsList", "Walks the active process list", "identify"),
  p("windows.pstree.PsTree", "Parent-child hierarchy of the active list", "identify"),
  p("windows.psscan.PsScan", "Pool-scans for _EPROCESS, including unlinked", "identify"),
  p("windows.malware.psxview.PsXView", "Cross-references every process source", "identify"),
  p("windows.sessions.Sessions", "Maps processes to logon sessions", "identify"),

  // 2 — Objects
  p("windows.cmdline.CmdLine", "Full command line per process", "objects", true),
  p("windows.dlllist.DllList", "Loaded modules and their load paths", "objects", true),
  p("windows.handles.Handles", "Open handles by type and granted access", "objects", true),
  p("windows.getsids.GetSIDs", "SIDs owning each process", "objects", true),
  p("windows.privileges.Privs", "Token privileges, present and enabled", "objects", true),
  p("windows.envars.Envars", "Process environment variables", "objects", true),
  p("windows.vadinfo.VadInfo", "Virtual address descriptors and protections", "objects", true),

  // 3 — Network
  p("windows.netscan.NetScan", "Pool-scans for connections and listeners", "network"),
  p("windows.netstat.NetStat", "Walks the network tracking structures", "network"),

  // 4 — Injection
  p("windows.malware.malfind.Malfind", "Private, executable, unbacked memory", "injection", true),
  p("windows.malware.ldrmodules.LdrModules", "Modules missing from a PEB list", "injection", true),
  p("windows.malware.hollowprocesses.HollowProcesses", "PEB image mismatched against the VAD", "injection", true),
  p("windows.malware.pebmasquerade.PebMasquerade", "EPROCESS name disagreeing with the PEB", "injection", true),
  p("windows.malware.processghosting.ProcessGhosting", "Backing file deleted or detached", "injection"),
  p("windows.malware.suspicious_threads.SuspiciousThreads", "Threads starting outside a mapped image", "injection", true),

  // 5 — Rootkit
  p("windows.ssdt.SSDT", "System call table and its owning modules", "rootkit"),
  p("windows.callbacks.Callbacks", "Kernel notification routines", "rootkit"),
  p("windows.modules.Modules", "Walks the loaded kernel module list", "rootkit"),
  p("windows.modscan.ModScan", "Pool-scans for kernel modules", "rootkit"),
  p("windows.malware.drivermodule.DriverModule", "Drivers absent from the module list", "rootkit"),
  p("windows.driverirp.DriverIrp", "IRP handler table per driver", "rootkit"),
  p("windows.malware.svcdiff.SvcDiff", "Services by list walk versus by scan", "rootkit"),
  p("windows.malware.unhooked_system_calls.UnhookedSystemCalls", "ntdll stubs differing from disk", "rootkit"),

  // 6 — Extract
  p("windows.pedump.PEDump", "Carve a PE image from an address", "extract", true),
  p("windows.dumpfiles.DumpFiles", "Write cached file contents to disk", "extract", true),
  p("windows.memmap.Memmap", "Dump a process address space", "extract", true),
  p("windows.vadwalk.VadWalk", "Walk and export the VAD tree", "extract", true),

  // Registry
  p("windows.registry.hivelist.HiveList", "Hives resident in memory", "registry"),
  p("windows.registry.printkey.PrintKey", "Read a key and its values", "registry"),
  p("windows.registry.userassist.UserAssist", "GUI programs the user launched", "registry"),
  p("windows.registry.amcache.Amcache", "Application execution evidence", "registry"),
  p("windows.shimcachemem.ShimcacheMem", "Shimcache entries from ahcache.sys", "registry"),
  p("windows.registry.scheduled_tasks.ScheduledTasks", "Scheduled task definitions and triggers", "registry"),

  // Timeline
  p("timeliner.Timeliner", "Every time-bearing plugin, merged and ordered", "timeline"),

  // Credentials — gated behind a dependency, on purpose
  p("windows.registry.hashdump.Hashdump", "Local account password hashes", "credentials", false, {
    reason: "Requires pycryptodome",
    missingModule: "Crypto",
  }),
  p("windows.registry.lsadump.Lsadump", "LSA secrets", "credentials", false, {
    reason: "Requires pycryptodome",
    missingModule: "Crypto",
  }),
  p("windows.registry.cachedump.Cachedump", "Cached domain credentials", "credentials", false, {
    reason: "Requires pycryptodome",
    missingModule: "Crypto",
  }),

  // Scan
  p("yarascan.YaraScan", "YARA rules across the kernel address space", "scan"),
  p("windows.vadyarascan.VadYaraScan", "YARA rules across process memory", "scan", true),
  p("regexscan.RegExScan", "Regular expressions across kernel memory", "scan"),
];
