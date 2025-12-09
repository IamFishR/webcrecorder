export interface MediaDevice {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
}

export type RecordingType = 'video' | 'audio' | 'screen';

export interface RecordedMedia {
  id: string;
  type: RecordingType;
  blob: Blob;
  url: string;
  createdAt: number; // Timestamp
  duration: number; // Seconds
  name: string;
}

export interface MediaConstraints {
  videoDeviceId?: string;
  audioDeviceId?: string;
  resolution?: '720p' | '1080p' | '4k';
}
