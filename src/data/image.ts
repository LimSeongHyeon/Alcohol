import type { ImageInfo } from "../types";

/** Stand-in for `windows.info.Info` output. Replaced by daemon data. */
export const image: ImageInfo = {
  fileName: "WS-FIN-04.raw",
  fullPath: "E:\\cases\\IR-2026-0431\\WS-FIN-04.raw",
  sizeBytes: 8_589_934_592,
  sha256: "9f2c41a0e7b83d5641c0aa9e2d7f1b8c3e5a6047d9128fbc3ea415d70b6c9812",
  os: "Windows 10",
  build: "19041.1949",
  arch: "Intel64",
  kernelBase: 0xf80_2c_60_00_00,
  dtb: 0x1ad000,
  processorCount: 8,
  systemTime: "2026-08-05 09:43:11 UTC",
  layerName: "layer_name",
  maxAddress: 0x1_ffff_ffff,
  symbolTable: "ntkrnlmp.pdb/1B4A9F0C…/ISF",
};
