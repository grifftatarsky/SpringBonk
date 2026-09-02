import type { Coordinate } from './sticker.models';

/**
 * Reads the GPS coordinate a camera wrote into a photo's EXIF block.
 *
 * Hand-parsed rather than pulled from a library: all this needs is four tags out
 * of one IFD, and every EXIF package is far larger than that — which matters
 * here, because this remote bundles its dependencies rather than sharing them.
 *
 * Nothing about the file is trusted. Every read is bounds-checked against the
 * buffer and every failure returns null, because a photo whose metadata cannot
 * be parsed is still a photo the user is entitled to upload.
 *
 * JPEG only. HEIC stores the same data in a completely different container, but
 * iOS converts to JPEG on upload through a file input, so the common path works.
 */

const SOI = 0xffd8;
const APP1 = 0xffe1;
const SOS = 0xffda;
/** "Exif" — the marker that distinguishes an EXIF APP1 from an XMP one. */
const EXIF_MAGIC = 0x45786966;

const TAG_GPS_IFD = 0x8825;
const GPS_LATITUDE_REF = 0x0001;
const GPS_LATITUDE = 0x0002;
const GPS_LONGITUDE_REF = 0x0003;
const GPS_LONGITUDE = 0x0004;

const TYPE_ASCII = 2;
const TYPE_RATIONAL = 5;

/** A JPEG segment cannot exceed 64kB, and EXIF is the first one after SOI. */
const HEAD_BYTES = 128 * 1024;

interface Entry {
  readonly type: number;
  readonly count: number;
  /** Offset of the 4-byte value field, which holds the value or a pointer to it. */
  readonly valueAt: number;
}

export async function readExifLocation(file: File): Promise<Coordinate | null> {
  try {
    const head = await file.slice(0, HEAD_BYTES).arrayBuffer();
    return parseJpeg(new DataView(head));
  } catch {
    return null;
  }
}

function parseJpeg(view: DataView): Coordinate | null {
  if (view.byteLength < 4 || view.getUint16(0) !== SOI) {
    return null;
  }
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    // Anything that is not a marker means the walk has desynced; anything from
    // the start of scan on is pixel data, and EXIF is never behind it.
    if ((marker & 0xff00) !== 0xff00 || marker === SOS) {
      return null;
    }
    const size = view.getUint16(offset + 2);
    if (size < 2) {
      return null;
    }
    if (
      marker === APP1 &&
      offset + 10 <= view.byteLength &&
      view.getUint32(offset + 4) === EXIF_MAGIC &&
      view.getUint16(offset + 8) === 0
    ) {
      return parseTiff(view, offset + 10);
    }
    offset += 2 + size;
  }
  return null;
}

/** The EXIF payload is a TIFF file; offsets inside it are relative to its start. */
function parseTiff(view: DataView, tiff: number): Coordinate | null {
  if (tiff + 8 > view.byteLength) {
    return null;
  }
  const byteOrder = view.getUint16(tiff);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) {
    return null;
  }
  if (view.getUint16(tiff + 2, little) !== 42) {
    return null;
  }

  const ifd0 = readEntries(view, tiff + view.getUint32(tiff + 4, little), little);
  const pointer = ifd0.get(TAG_GPS_IFD);
  if (!pointer) {
    return null;
  }
  const gps = readEntries(view, tiff + view.getUint32(pointer.valueAt, little), little);

  const latitude = degrees(view, tiff, gps, little, GPS_LATITUDE, GPS_LATITUDE_REF, 'S');
  const longitude = degrees(view, tiff, gps, little, GPS_LONGITUDE, GPS_LONGITUDE_REF, 'W');
  if (latitude === null || longitude === null) {
    return null;
  }
  // Out-of-range is corruption. Null Island is what a camera writes when it has
  // a GPS chip and no fix, and is never somewhere a photo was actually taken.
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  if (latitude === 0 && longitude === 0) {
    return null;
  }
  return { latitude, longitude };
}

function readEntries(view: DataView, dir: number, little: boolean): Map<number, Entry> {
  const entries = new Map<number, Entry>();
  if (dir < 0 || dir + 2 > view.byteLength) {
    return entries;
  }
  const count = view.getUint16(dir, little);
  for (let i = 0; i < count; i++) {
    const at = dir + 2 + i * 12;
    if (at + 12 > view.byteLength) {
      break;
    }
    entries.set(view.getUint16(at, little), {
      type: view.getUint16(at + 2, little),
      count: view.getUint32(at + 4, little),
      valueAt: at + 8,
    });
  }
  return entries;
}

/** Degrees/minutes/seconds plus a hemisphere letter, collapsed to a signed decimal. */
function degrees(
  view: DataView,
  tiff: number,
  gps: Map<number, Entry>,
  little: boolean,
  valueTag: number,
  refTag: number,
  negative: string,
): number | null {
  const value = gps.get(valueTag);
  const ref = gps.get(refTag);
  if (!value || !ref || value.type !== TYPE_RATIONAL || value.count < 3) {
    return null;
  }

  // Three rationals are 24 bytes, far past the 4 that fit inline, so the value
  // field is always a pointer here.
  const base = tiff + view.getUint32(value.valueAt, little);
  let decimal = 0;
  for (let i = 0; i < 3; i++) {
    const at = base + i * 8;
    if (at + 8 > view.byteLength) {
      return null;
    }
    const numerator = view.getUint32(at, little);
    const denominator = view.getUint32(at + 4, little);
    if (denominator === 0) {
      return null;
    }
    decimal += numerator / denominator / 60 ** i;
  }

  const hemisphere = ascii(view, tiff, ref, little);
  if (hemisphere === null) {
    return null;
  }
  return hemisphere === negative ? -decimal : decimal;
}

function ascii(view: DataView, tiff: number, entry: Entry, little: boolean): string | null {
  if (entry.type !== TYPE_ASCII || entry.count < 1) {
    return null;
  }
  // Up to four bytes live in the value field itself; more, and it is a pointer.
  const at = entry.count <= 4 ? entry.valueAt : tiff + view.getUint32(entry.valueAt, little);
  if (at < 0 || at + 1 > view.byteLength) {
    return null;
  }
  return String.fromCharCode(view.getUint8(at)).toUpperCase();
}
