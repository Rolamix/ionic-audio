import { Observable } from "rxjs/Observable";

/**
 * Defines the audio provider contract
 *
 * @export
 * @interface IAudioProvider
 */
export interface IAudioProvider {
  current: number;
  tracks: IAudioTrack[];

  create(track: ITrackConstraint): IAudioTrack;
  replace(oldAudioTrack: IAudioTrack, newTrack: ITrackConstraint): IAudioTrack;
  add(track: IAudioTrack);
  play(index: number);
  pause(index?: number);
  stop(index?: number);
}

/**
 * Defines the properties for JSON objects representing tracks to be played
 *
 * @export
 * @interface ITrackConstraint
 */
export interface ITrackConstraint {
  id?:number;
  src: string;
  title?: string;
  artist?: string;
  art?: string;
  preload?: string;
}

/**
 * Defines the audio track contract
 *
 * @export
 * @interface IAudioTrack
 * @extends {ITrackConstraint}
 */
export interface IAudioTrack extends ITrackConstraint {
  src: string;
  id: number;
  isPlaying: boolean;
  isLoading: boolean;
  isFinished: boolean;
  hasLoaded: boolean
  /**
   * Gets the track duration in seconds, or -1 if it cannot be determined
   *
   * @property duration
   * @readonly
   * @type {number}
   */
  duration: number;
  /**
   * Gets current track time (progress) in seconds
   *
   * @property progress
   * @readonly
   * @type {number}
   */
  progress: number;
  /**
   * Gets current track progress as a percentage
   *
   * @property completed
   * @readonly
   * @type {number}
   */
  completed: number;
  /**
   * Gets the current volume
   *
   * @property volume
   * @readonly
   * @type {number}
   */
  volume: number;
  canPlay:  boolean;
  error: MediaError;

  play();
  pause();
  stop();
  seekTo(time: number, byPercent?: boolean);
  setVolume(volume: number);
  destroy();
  subscribe(): Observable<any>;
  observer: Observable<any>;
}

/**
 * Defines code to msg events
 *
 * @export
 * @interface IAudioTrack
 * @extends {ITrackConstraint}
 */

export enum STATUS_MEDIA  {
  MEDIA_NONE = 0,
  MEDIA_STARTING = 1,
  MEDIA_RUNNING = 2,
  MEDIA_PAUSED = 3,
  MEDIA_STOPPED = 4,
  MEDIA_POSITION = 5,
  MEDIA_PROGRESS = 6,
  MEDIA_SUSPEND = 7,
  MEDIA_SEEKTO = 8,
  MEDIA_ERROR = 9,
  MEDIA_DURATION_CHANGE = 10,
  MEDIA_PROGRESS_ENABLE = 11,
}

export const STATUS_MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped",
                                 "Position", "Progress", "Suspend", "Seek", "Error",
                                 "DurationChange", "ProgressEnabled"]; // ProgressEnabled is like 'canPlay'

export interface IMessage {
  status: STATUS_MEDIA;
  value: any;
}

export function createMessage({ value, status }: IMessage) {
  const msg = STATUS_MEDIA_MSG[status];
  return { value, status, eventName: msg };
}
