/**
 * A deliberately tiny protobuf reader/writer: just enough for Google Authenticator's
 * export format (varints and length-delimited fields). Wire types:
 *   0 = varint, 2 = length-delimited (bytes, strings, nested messages).
 */

export interface Field {
  num: number;
  wire: number;
  int?: bigint;
  bytes?: Uint8Array;
}

export function readFields(buf: Uint8Array): Field[] {
  const out: Field[] = [];
  let i = 0;
  const varint = (): bigint => {
    let shift = 0n;
    let result = 0n;
    for (;;) {
      if (i >= buf.length) throw new Error('truncated varint');
      const b = buf[i++]!;
      result |= BigInt(b & 0x7f) << shift;
      if ((b & 0x80) === 0) return result;
      shift += 7n;
    }
  };
  while (i < buf.length) {
    const key = Number(varint());
    const num = key >>> 3;
    const wire = key & 7;
    if (wire === 0) out.push({ num, wire, int: varint() });
    else if (wire === 2) {
      const len = Number(varint());
      if (i + len > buf.length) throw new Error('truncated field');
      out.push({ num, wire, bytes: buf.subarray(i, i + len) });
      i += len;
    } else if (wire === 5) i += 4;
    else if (wire === 1) i += 8;
    else throw new Error(`unsupported wire type ${wire}`);
  }
  return out;
}

export class Writer {
  private parts: number[] = [];
  private varint(v: bigint) {
    do {
      let b = Number(v & 0x7fn);
      v >>= 7n;
      if (v > 0n) b |= 0x80;
      this.parts.push(b);
    } while (v > 0n);
  }
  int(num: number, v: number | bigint) {
    this.varint(BigInt((num << 3) | 0));
    this.varint(BigInt(v));
    return this;
  }
  bytes(num: number, v: Uint8Array) {
    this.varint(BigInt((num << 3) | 2));
    this.varint(BigInt(v.length));
    this.parts.push(...v);
    return this;
  }
  string(num: number, s: string) {
    return this.bytes(num, new TextEncoder().encode(s));
  }
  finish() {
    return Uint8Array.from(this.parts);
  }
}
