import type { RecentCase } from "../components/OpenImage";

/**
 * Stand-in for the recent-case index the shell keeps on disk.
 *
 * A case is an .alcohol archive — see docs/case-file.md. It holds plugin
 * results, highlights and notes, keyed to an image by SHA-256. It never holds
 * the image.
 */
export const recentCases: RecentCase[] = [
  {
    caseFile: "IR-2026-0431.alcohol",
    imageName: "WS-FIN-04.raw",
    imagePath: "E:\\cases\\IR-2026-0431\\WS-FIN-04.raw",
    sizeBytes: 8_589_934_592,
    profile: "Windows 10 19041 x64",
    openedAt: "2 hours ago",
    pluginRuns: 4,
    alerts: 10,
    imageMissing: false,
  },
  {
    caseFile: "IR-2026-0428-dc01.alcohol",
    imageName: "DC01.mem",
    imagePath: "E:\\cases\\IR-2026-0428\\DC01.mem",
    sizeBytes: 17_179_869_184,
    profile: "Windows Server 2019 17763 x64",
    openedAt: "yesterday",
    pluginRuns: 11,
    alerts: 3,
    imageMissing: false,
  },
  {
    caseFile: "ctf-flareon-9.alcohol",
    imageName: "challenge.vmem",
    imagePath: "D:\\ctf\\flareon\\challenge.vmem",
    sizeBytes: 2_147_483_648,
    profile: "Windows 7 SP1 7601 x64",
    openedAt: "last Tuesday",
    pluginRuns: 7,
    alerts: 0,
    imageMissing: true,
  },
  {
    caseFile: "lab-ubuntu-2204.alcohol",
    imageName: "ubuntu-2204.lime",
    imagePath: "/srv/lab/captures/ubuntu-2204.lime",
    sizeBytes: 4_294_967_296,
    profile: "Linux 5.15.0-91-generic x64",
    openedAt: "3 weeks ago",
    pluginRuns: 2,
    alerts: 1,
    imageMissing: false,
  },
];
