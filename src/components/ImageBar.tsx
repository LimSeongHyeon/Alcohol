import type { ImageInfo } from "../types";
import { bytes, hex } from "../format";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span className="eyebrow">{label}</span>
      <span className="fact-value">{value}</span>
    </div>
  );
}

export function ImageBar({ image }: { image: ImageInfo }) {
  return (
    <header className="imagebar">
      <div className="imagebar-mark">
        <span className="imagebar-wordmark">ALCOHOL</span>
      </div>

      <div className="imagebar-file">
        <span className="imagebar-name">{image.fileName}</span>
        <span className="imagebar-path">{image.fullPath}</span>
      </div>

      <div className="imagebar-facts">
        <Fact label="Profile" value={`${image.os} ${image.build}`} />
        <Fact label="Arch" value={image.arch} />
        <Fact label="Size" value={bytes(image.sizeBytes)} />
        <Fact label="DTB" value={hex(image.dtb)} />
        <Fact label="Kernel base" value={hex(image.kernelBase)} />
        <Fact label="CPUs" value={String(image.processorCount)} />
        <Fact label="Captured" value={image.systemTime.slice(0, 19)} />
      </div>
    </header>
  );
}
