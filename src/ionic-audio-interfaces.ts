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
  duration: number;
  progress: number;
  completed: number;
  canPlay:  boolean;
  error: MediaError;

  play();
  pause();
  stop();
  seekTo(time: number);
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
  MEDIA_DURATION_CHANGUE = 10,
  MEDIA_PROGRESS_ENABLE = 11,

}

export interface IMessage {
  status: STATUS_MEDIA;
  value: any;
}


