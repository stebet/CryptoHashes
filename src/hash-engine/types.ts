export type HashInput = string | Uint8Array;

export type DeterministicAlgorithm =
  | 'md5'
  | 'ntlm'
  | 'sha1'
  | 'sha256'
  | 'sha512';
export type HashWarningCode = never;

export interface HashWarning {
  code: HashWarningCode;
  message: string;
  severity: 'info' | 'warning';
}

export interface DeterministicHashRequest {
  algorithm: DeterministicAlgorithm;
  input: HashInput;
}

export interface DeterministicHashResult {
  kind: 'deterministic';
  algorithm: DeterministicAlgorithm;
  digest: string;
  encoding: 'hex';
  warnings: HashWarning[];
}
